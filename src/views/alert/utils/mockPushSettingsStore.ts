import type { AlarmPushEndpoint, PushFieldMappingGroup, UserPushBinding } from '../pushSettings.types';
import { defHttp } from '@/utils/http/axios';
import {
  ALGORITHM_OUTPUT_FIELDS,
  ANALYSIS_OUTPUT_FIELDS,
} from '../pushOutputFieldCatalog';

import { createEmptyFieldMappingGroup } from './pushUtils';
import { secureUint32 } from '@/utils/secureRandom';

const VALID_ALGORITHM_KEYS = new Set(ALGORITHM_OUTPUT_FIELDS.map(item => item.key));

let endpoints: AlarmPushEndpoint[] = [];

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  // VIDEO is protected by the platform JWT.  Do not use bare fetch here:
  // it drops X-Authorization and makes the settings page fail on mount.
  defHttp.setHeader({ 'X-Authorization': `Bearer ${localStorage.getItem('jwt_token') || ''}` });
  const method = (options?.method || 'GET').toLowerCase() as 'get' | 'post' | 'put' | 'delete';
  const response = await defHttp[method]({
    url,
    data: options?.body ? JSON.parse(String(options.body)) : undefined,
    headers: { ignoreCancelToken: true },
  }, { isTransformResponse: false });
  const body = (response as any)?.data ?? response;
  if (body?.code !== 0)
    throw new Error(body.msg || '推送地址请求失败');
  return body.data as T;
}

function normalizeFieldMapping(raw: Partial<PushFieldMappingGroup> & Record<string, unknown>): PushFieldMappingGroup {
  if (raw.key_source !== undefined || raw.key_target !== undefined) {
    return {
      key_source: String(raw.key_source ?? ''),
      key_target: String(raw.key_target ?? ''),
      value_source: String(raw.value_source ?? ''),
      value_target: String(raw.value_target ?? ''),
      locked: !!raw.locked,
    };
  }
  if (raw.field_type !== undefined || raw.source_value !== undefined) {
    return {
      key_source: String(raw.source_value ?? ''),
      key_target: String(raw.target_value ?? ''),
      value_source: '',
      value_target: '',
    };
  }
  return {
    key_source: String(raw.source_key ?? ''),
    key_target: String(raw.target_key ?? ''),
    value_source: '',
    value_target: '',
  };
}

function normalizeEndpoint(item: AlarmPushEndpoint): AlarmPushEndpoint {
  return {
    ...item,
    platform: item.platform || 'webhook',
    output_content: {
      algorithm_fields: [...(item.output_content?.algorithm_fields ?? [])]
        .filter(key => VALID_ALGORITHM_KEYS.has(key)),
      analysis_fields: [...(item.output_content?.analysis_fields ?? [])],
    },
    request_headers: [...(item.request_headers ?? [])],
    extra_fields: [...(item.extra_fields ?? [])],
    field_mappings: (item.field_mappings ?? []).map(entry =>
      normalizeFieldMapping(entry as Partial<PushFieldMappingGroup> & Record<string, unknown>),
    ),
  };
}

export function getPushProfiles(): AlarmPushEndpoint[] {
  return endpoints.map(item => JSON.parse(JSON.stringify(item)));
}

export function getPushProfileById(profileId: string): AlarmPushEndpoint | null {
  const found = endpoints.find(item => item.profile_id === profileId);
  return found ? JSON.parse(JSON.stringify(found)) : null;
}

export function addPushProfile(profile: AlarmPushEndpoint): AlarmPushEndpoint {
  endpoints.push(normalizeEndpoint(JSON.parse(JSON.stringify(profile))));
  return getPushProfileById(profile.profile_id)!;
}

export function updatePushProfile(profile: AlarmPushEndpoint): AlarmPushEndpoint | null {
  const index = endpoints.findIndex(item => item.profile_id === profile.profile_id);
  if (index < 0)
    return null;
  endpoints[index] = normalizeEndpoint(JSON.parse(JSON.stringify(profile)));
  return getPushProfileById(profile.profile_id);
}

export function deletePushProfile(profileId: string): boolean {
  const before = endpoints.length;
  endpoints = endpoints.filter(item => item.profile_id !== profileId);
  if (endpoints.length === before)
    return false;
  return true;
}

export function createEmptyPushProfile(): AlarmPushEndpoint {
  return {
    profile_id: `push_endpoint_${Date.now()}_${(secureUint32() % 0xffffff).toString(36)}`,
    profile_name: '',
    platform: 'webhook',
    push_url: '',
    enabled: true,
    online: undefined,
    output_content: {
      algorithm_fields: ALGORITHM_OUTPUT_FIELDS.map(item => item.key),
      analysis_fields: ANALYSIS_OUTPUT_FIELDS.map(item => item.key),
    },
    request_headers: [{ key: '', value: '' }],
    extra_fields: [{ key: '', value: '' }],
    field_mappings: [createEmptyFieldMappingGroup()],
  };
}

function isPushUrlValid(url: string | undefined): boolean {
  return !!url?.trim() && /^https?:\/\//i.test(url.trim());
}

export interface PushEndpointTestResult {
  ok: boolean;
  statusText: string;
  responseText: string;
}

export async function testPushEndpointWithPayload(
  profileId: string,
  payloadText: string,
): Promise<PushEndpointTestResult> {
  const item = endpoints.find(entry => entry.profile_id === profileId);
  if (!item) {
    return {
      ok: false,
      statusText: '失败',
      responseText: JSON.stringify({ code: 404, msg: '推送配置不存在' }, null, 2),
    };
  }

  let payload: Record<string, unknown>;
  try { payload = JSON.parse(payloadText) as Record<string, unknown>; }
  catch {
    return {
      ok: false,
      statusText: '失败',
      responseText: JSON.stringify({ code: 400, msg: '测试内容不是有效 JSON' }, null, 2),
    };
  }

  try {
    const result = await request<{ status_code?: number; response_text?: string }>(`/video/alert/endpoints/${encodeURIComponent(profileId)}/test`, {
      method: 'POST', body: JSON.stringify({ payload }),
    });
    await loadPushProfiles();
    return { ok: true, statusText: '成功', responseText: result.response_text || `HTTP ${result.status_code ?? 200}` };
  }
  catch (error) {
    await loadPushProfiles().catch(() => undefined);
    return { ok: false, statusText: '失败', responseText: error instanceof Error ? error.message : String(error) };
  }
}

export async function loadPushProfiles(): Promise<AlarmPushEndpoint[]> {
  endpoints = (await request<AlarmPushEndpoint[]>('/video/alert/endpoints')).map(normalizeEndpoint);
  return getPushProfiles();
}

export async function savePushProfile(profile: AlarmPushEndpoint, isCreate: boolean): Promise<AlarmPushEndpoint> {
  const saved = await request<AlarmPushEndpoint>(
    isCreate ? '/video/alert/endpoints' : `/video/alert/endpoints/${encodeURIComponent(profile.profile_id)}`,
    { method: isCreate ? 'POST' : 'PUT', body: JSON.stringify(profile) },
  );
  await loadPushProfiles();
  return saved;
}

export async function removePushProfile(profileId: string): Promise<void> {
  await request<void>(`/video/alert/endpoints/${encodeURIComponent(profileId)}`, { method: 'DELETE' });
  await loadPushProfiles();
}

export function loadUserPushBindings(): Promise<UserPushBinding[]> {
  return request<UserPushBinding[]>('/video/alert/user-bindings');
}

export function saveUserPushBinding(binding: UserPushBinding): Promise<UserPushBinding> {
  const isCreate = binding.id == null;
  return request<UserPushBinding>(
    isCreate ? '/video/alert/user-bindings' : `/video/alert/user-bindings/${binding.id}`,
    { method: isCreate ? 'POST' : 'PUT', body: JSON.stringify(binding) },
  );
}

export function removeUserPushBinding(bindingId: number): Promise<void> {
  return request<void>(`/video/alert/user-bindings/${bindingId}`, { method: 'DELETE' });
}

export async function testUserPushBindingWithPayload(
  bindingId: number,
  payloadText: string,
): Promise<PushEndpointTestResult> {
  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(payloadText) as Record<string, unknown>;
  }
  catch {
    return {
      ok: false,
      statusText: '失败',
      responseText: JSON.stringify({ code: 400, msg: '测试内容不是有效 JSON' }, null, 2),
    };
  }
  try {
    const result = await request<{ status_code?: number; response_text?: string }>(
      `/video/alert/user-bindings/${bindingId}/test`,
      { method: 'POST', body: JSON.stringify({ payload }) },
    );
    return {
      ok: true,
      statusText: '成功',
      responseText: result.response_text || `HTTP ${result.status_code ?? 200}`,
    };
  }
  catch (error) {
    return {
      ok: false,
      statusText: '失败',
      responseText: error instanceof Error ? error.message : String(error),
    };
  }
}
