import type { AlertPushDraft } from '@/views/algorithm-task/algorithmTaskDraft.types';
import type { AlarmPushEndpoint, PushFieldMappingGroup } from '../pushSettings.types';
import { getPushProfiles } from './mockPushSettingsStore';

/** 推送设置弹窗 z-index 为 4000，下拉需在其之上 */
export const SELECT_DROPDOWN_STYLE = { zIndex: 4100 };

export function selectPopupContainer() {
  return document.body;
}

export function truncatePushUrl(url: string, max = 48) {
  const text = url.trim();
  if (!text)
    return '—';
  if (text.length <= max)
    return text;
  return `${text.slice(0, max - 4)}…${text.slice(-3)}`;
}

export function createEmptyFieldMappingGroup(): PushFieldMappingGroup {
  return {
    key_source: '',
    key_target: '',
    value_source: '',
    value_target: '',
    locked: false,
  };
}

function mappingGroupHasContent(group: PushFieldMappingGroup) {
  return [
    group.key_source,
    group.key_target,
    group.value_source,
    group.value_target,
  ].some(value => value?.trim());
}

export function validatePushEndpoint(endpoint: AlarmPushEndpoint): string | null {
  if (!endpoint.profile_name?.trim())
    return '请填写名称';
  const url = endpoint.push_url?.trim();
  if (!url)
    return '请填写推送地址';
  if (!/^https?:\/\/.+/i.test(url))
    return '推送地址需以 http:// 或 https:// 开头';

  for (const header of endpoint.request_headers) {
    if (header.key?.trim() && !header.value?.trim())
      return '请求头存在空值，请补全或删除';
  }
  for (const field of endpoint.extra_fields) {
    if (field.key?.trim() && !field.value?.trim())
      return '扩展字段存在空值，请补全或删除';
  }
  for (const group of endpoint.field_mappings) {
    if (!mappingGroupHasContent(group))
      continue;
    if (!group.key_source?.trim())
      return '字段对照请填写 key 原始值';
    if (!group.key_target?.trim())
      return '字段对照请填写 key 映射值';
    if (group.value_source?.trim() && !group.value_target?.trim())
      return '字段对照请填写 value 映射值';
    if (group.value_target?.trim() && !group.value_source?.trim())
      return '字段对照请填写 value 原始值';
  }

  const outputCount =
    endpoint.output_content.algorithm_fields.length
    + endpoint.output_content.analysis_fields.length;
  if (outputCount === 0)
    return '请至少选择一项输出内容';

  return null;
}

export function clonePushEndpoint(endpoint: AlarmPushEndpoint): AlarmPushEndpoint {
  return JSON.parse(JSON.stringify(endpoint)) as AlarmPushEndpoint;
}

/** 打开编辑时保证请求头/扩展字段/字段对照至少有一行可编辑空行 */
export function ensurePushEndpointEditableRows(endpoint: AlarmPushEndpoint): AlarmPushEndpoint {
  const cloned = clonePushEndpoint(endpoint);
  if (!cloned.request_headers.length)
    cloned.request_headers = [{ key: '', value: '' }];
  else
    cloned.request_headers = cloned.request_headers.map(row => ({ ...row, locked: false }));

  if (!cloned.extra_fields.length)
    cloned.extra_fields = [{ key: '', value: '' }];

  if (!cloned.field_mappings.length)
    cloned.field_mappings = [createEmptyFieldMappingGroup()];
  else
    cloned.field_mappings = cloned.field_mappings.map(group => ({ ...group, locked: false }));

  return cloned;
}

export function summarizePushEndpoint(endpoint: AlarmPushEndpoint): string {
  return truncatePushUrl(endpoint.push_url);
}

export function summarizePushProfile(profile: AlarmPushEndpoint): string {
  return summarizePushEndpoint(profile);
}

export { validatePushEndpoint as validatePushProfile };

export function resolveAlertPushForSubmit(push: AlertPushDraft): AlertPushDraft {
  if (push.push_mode === 'address') {
    const endpoints = getPushProfiles().filter(item =>
      push.address_profile_ids?.includes(item.profile_id),
    );
    return {
      ...push,
      channel_config: {
        endpoints: endpoints.map(item => ({
          profile_id: item.profile_id,
          profile_name: item.profile_name,
          push_url: item.push_url,
          output_content: item.output_content,
          request_headers: item.request_headers,
          extra_fields: item.extra_fields,
          field_mappings: item.field_mappings,
        })),
      } as AlertPushDraft['channel_config'],
    };
  }

  return { ...push };
}

export function ensureChannelProfileDefaults(push: AlertPushDraft): AlertPushDraft {
  if (push.push_mode === 'address') {
    const profiles = getPushProfiles().filter(item => item.enabled);
    if (!push.address_profile_ids?.length && profiles[0]) {
      return {
        ...push,
        address_profile_ids: [profiles[0].profile_id],
      };
    }
  }
  return { ...push };
}

export const DEFAULT_PUSH_TEST_PAYLOAD: Record<string, unknown> = {
  alarm_pic_data: null,
  alarm_pic_name: 'alarm_picture.jpg',
  alarm_pic_url: 'http://example.com/alarm_picture.jpg',
  algorithm_id: 4,
  algorithm_name: '行人闯入',
  algorithm_name_en: 'CR_PERSON_INVASION',
  analysis_job_id: 'ee6234ca5a7541dba61062d66ad82a8b',
  camera_group: null,
};

export function buildPushTestPayloadText(endpoint?: AlarmPushEndpoint | null): string {
  const payload: Record<string, unknown> = { ...DEFAULT_PUSH_TEST_PAYLOAD };
  if (endpoint?.profile_name)
    payload.push_profile_name = endpoint.profile_name;
  if (endpoint?.push_url)
    payload.push_url = endpoint.push_url;
  return JSON.stringify(payload, null, 2);
}
