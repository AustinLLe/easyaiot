import type { AlarmPushEndpoint, PushFieldMappingGroup } from '../pushSettings.types';
import {
  ALGORITHM_OUTPUT_FIELDS,
  ANALYSIS_OUTPUT_FIELDS,
} from '../pushOutputFieldCatalog';

import { createEmptyFieldMappingGroup } from './pushUtils';

const VALID_ALGORITHM_KEYS = new Set(ALGORITHM_OUTPUT_FIELDS.map(item => item.key));

const STORAGE_KEY = 'easyaiot_alarm_push_endpoints_v1';

let endpoints: AlarmPushEndpoint[] = loadEndpoints();

function loadEndpoints(): AlarmPushEndpoint[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw)
      return [];
    const parsed = JSON.parse(raw) as AlarmPushEndpoint[];
    return Array.isArray(parsed) ? parsed.map(normalizeEndpoint) : [];
  }
  catch {
    return [];
  }
}

function persistEndpoints() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(endpoints));
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
  persistEndpoints();
  return getPushProfileById(profile.profile_id)!;
}

export function updatePushProfile(profile: AlarmPushEndpoint): AlarmPushEndpoint | null {
  const index = endpoints.findIndex(item => item.profile_id === profile.profile_id);
  if (index < 0)
    return null;
  endpoints[index] = normalizeEndpoint(JSON.parse(JSON.stringify(profile)));
  persistEndpoints();
  return getPushProfileById(profile.profile_id);
}

export function deletePushProfile(profileId: string): boolean {
  const before = endpoints.length;
  endpoints = endpoints.filter(item => item.profile_id !== profileId);
  if (endpoints.length === before)
    return false;
  persistEndpoints();
  return true;
}

export function createEmptyPushProfile(): AlarmPushEndpoint {
  return {
    profile_id: `push_endpoint_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    profile_name: '',
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

  await new Promise(resolve => setTimeout(resolve, 400));

  try {
    JSON.parse(payloadText);
  }
  catch {
    return {
      ok: false,
      statusText: '失败',
      responseText: JSON.stringify({ code: 400, msg: '测试内容不是有效 JSON' }, null, 2),
    };
  }

  const online = isPushUrlValid(item.push_url);
  item.online = online;
  item.last_test_at = new Date().toISOString();
  persistEndpoints();

  if (!online) {
    return {
      ok: false,
      statusText: '失败',
      responseText: JSON.stringify(
        { code: 400, msg: '推送地址无效，请检查 http:// 或 https:// 格式', url: item.push_url },
        null,
        2,
      ),
    };
  }

  return {
    ok: true,
    statusText: '成功',
    responseText: JSON.stringify({ code: 0, msg: 'ok', data: { received: true } }, null, 2),
  };
}
