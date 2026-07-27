// ---- from logicExpressionUtils.ts ----
import type { AlertRuleConditionDraft, AlertRuleDraft, AlgorithmTaskDraft } from '../algorithmTaskDraft.types';
import { getAlertClassOptionsForDraftModels } from './paramUtils';

export type LogicExpressionToken =
  | { type: 'cond'; seq: number }
  | { type: 'op'; value: 'AND' | 'OR' }
  | { type: 'paren'; value: '(' | ')' };

export function tokensToExpression(tokens: LogicExpressionToken[]): string {
  return tokens.map((token) => {
    if (token.type === 'cond')
      return String(token.seq);
    if (token.type === 'op')
      return token.value;
    return token.value;
  }).join(' ');
}

export function expressionToTokens(expression: string): LogicExpressionToken[] {
  const trimmed = expression.trim();
  if (!trimmed)
    return [];

  const parts = trimmed.split(/\s+/);
  const tokens: LogicExpressionToken[] = [];

  for (const part of parts) {
    if (part === 'AND' || part === 'OR') {
      tokens.push({ type: 'op', value: part });
      continue;
    }
    if (part === '(' || part === ')') {
      tokens.push({ type: 'paren', value: part });
      continue;
    }
    const seq = Number(part);
    if (Number.isInteger(seq) && seq > 0)
      tokens.push({ type: 'cond', seq });
  }

  return tokens;
}

export function formatLogicExpressionDisplay(expression: string): string {
  return expression
    .replace(/\bAND\b/g, '且')
    .replace(/\bOR\b/g, '或');
}

export function buildDefaultLogicExpression(conditions: AlertRuleConditionDraft[]): string {
  if (!conditions.length)
    return '';
  if (conditions.length === 1)
    return String(conditions[0].seq ?? 1);
  return conditions.map(c => String(c.seq)).join(' AND ');
}

export function validateLogicExpression(
  expression: string,
  conditions: AlertRuleConditionDraft[],
): string | null {
  const trimmed = expression.trim();
  if (!trimmed)
    return '请配置条件关系表达式';

  const tokens = expressionToTokens(trimmed);
  if (!tokens.length)
    return '条件关系表达式无效';

  const validSeqs = new Set(conditions.map(c => c.seq));
  let balance = 0;

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    const prev = tokens[i - 1];
    const next = tokens[i + 1];

    if (token.type === 'cond') {
      if (!validSeqs.has(token.seq))
        return `表达式中的序号 ${token.seq} 不存在`;
      if (prev && (prev.type === 'cond' || (prev.type === 'paren' && prev.value === ')')))
        return '序号之间缺少且/或运算符';
    }

    if (token.type === 'op') {
      if (!prev || (prev.type !== 'cond' && !(prev.type === 'paren' && prev.value === ')')))
        return '且/或运算符位置不正确';
      if (!next || (next.type !== 'cond' && !(next.type === 'paren' && next.value === '(')))
        return '且/或运算符后缺少条件序号';
    }

    if (token.type === 'paren') {
      if (token.value === '(') {
        balance += 1;
        if (prev && (prev.type === 'cond' || (prev.type === 'paren' && prev.value === ')')))
          return '左括号前缺少且/或运算符';
        if (!next || (next.type !== 'cond' && !(next.type === 'paren' && next.value === '(')))
          return '左括号后缺少条件序号';
      }
      else {
        balance -= 1;
        if (balance < 0)
          return '括号不匹配';
        if (next && next.type !== 'op' && !(next.type === 'paren' && next.value === ')'))
          return '右括号后缺少且/或运算符';
      }
    }
  }

  if (balance !== 0)
    return '括号不匹配';

  const usedSeqs = tokens.filter(t => t.type === 'cond').map(t => t.seq);
  if (!usedSeqs.length)
    return '表达式中至少引用一个条件序号';

  return null;
}

export function normalizeAlertRuleBeforeSave(rule: AlertRuleDraft): AlertRuleDraft {
  const cloned = {
    ...rule,
    scope: { ...rule.scope },
    conditions: renumberConditions(rule.conditions.map(c => ({ ...c }))),
  };

  if (!cloned.logic_expression?.trim()) {
    cloned.logic_expression = rule.logic === 'OR'
      ? cloned.conditions.map(c => String(c.seq)).join(' OR ')
      : buildDefaultLogicExpression(cloned.conditions);
  }

  if (!cloned.clip_record_enabled) {
    cloned.clip_before_sec = undefined;
    cloned.clip_after_sec = undefined;
  }

  return cloned;
}

export function migrateAlertRule(rule: AlertRuleDraft): AlertRuleDraft {
  const conditions = renumberConditions(
    (rule.conditions ?? []).map((c, index) => ({
      seq: c.seq ?? index + 1,
      model_id: c.model_id ?? null,
      model_name: c.model_name,
      class_name: c.class_name ?? '',
      operator: c.operator,
      count: c.count,
    })),
  );

  let logic_expression = rule.logic_expression?.trim() ?? '';
  if (!logic_expression) {
    logic_expression = rule.logic === 'OR'
      ? conditions.map(c => String(c.seq)).join(' OR ')
      : buildDefaultLogicExpression(conditions);
  }

  return {
    ...rule,
    conditions,
    logic_expression,
    clip_record_enabled: rule.clip_record_enabled ?? false,
  };
}

export function renumberConditions(conditions: AlertRuleConditionDraft[]): AlertRuleConditionDraft[] {
  return conditions.map((condition, index) => ({
    ...condition,
    seq: index + 1,
  }));
}

export function appendConditionToExpression(expression: string, newSeq: number): string {
  const trimmed = expression.trim();
  if (!trimmed)
    return String(newSeq);
  return `(${trimmed}) AND ${newSeq}`;
}

export function adjustLogicExpressionAfterRemove(
  expression: string,
  removedSeq: number,
  conditions: AlertRuleConditionDraft[],
): string {
  const remapped = expressionToTokens(expression)
    .filter(token => !(token.type === 'cond' && token.seq === removedSeq))
    .map((token) => {
      if (token.type === 'cond' && token.seq > removedSeq)
        return { ...token, seq: token.seq - 1 };
      return token;
    });

  const next = tokensToExpression(remapped);
  if (!next.trim() || validateLogicExpression(next, conditions))
    return buildDefaultLogicExpression(conditions);
  return next;
}

export function syncModelNamesOnConditions(
  conditions: AlertRuleConditionDraft[],
  modelOptions: Array<{ label: string; value: number }>,
) {
  const nameMap = new Map(modelOptions.map(item => [item.value, item.label]));
  conditions.forEach((condition) => {
    if (condition.model_id != null)
      condition.model_name = nameMap.get(condition.model_id) ?? condition.model_name;
  });
}

export function getModelOptionsFromDraft(draft: AlgorithmTaskDraft) {
  const ids = draft.model_ids ?? [];
  return ids.map(id => ({
    label: draft.model_name_map?.[id] ?? `模型 ${id}`,
    value: id,
  }));
}

// ---- from alertRuleUtils.ts ----
import type {
  AlertRuleBehaviorType,
  AlertRuleConditionDraft,
  AlertRuleDraft,
  AlertRuleOperator,
  AlgorithmTaskDraft,
  DynamicLineDirection,
} from '../algorithmTaskDraft.types';

export const DEFAULT_CLASS_NAMES = ['person', 'helmet', 'no_helmet', 'head'];

export const SEVERITY_OPTIONS = [
  { label: '一级', value: 'high' as const },
  { label: '二级', value: 'medium' as const },
  { label: '三级', value: 'low' as const },
];

export const LOGIC_OPTIONS = [
  { label: '满足全部 AND', value: 'AND' as const },
  { label: '满足任一 OR', value: 'OR' as const },
];


export const ALERT_BEHAVIOR_LABEL_MAP: Record<AlertRuleBehaviorType, string> = {
  static_count: '\u9759\u6001\u68c0\u6d4b',
  intrusion: '\u533a\u57df\u5165\u4fb5',
  dwell: '\u533a\u57df\u505c\u7559',
  line_crossing: '\u8d8a\u7ebf\u68c0\u6d4b',
};

export const DYNAMIC_BEHAVIOR_OPTIONS: Array<{ label: string; value: Exclude<AlertRuleBehaviorType, 'static_count' | 'line_crossing'> }> = [
  { label: '\u533a\u57df\u5165\u4fb5', value: 'intrusion' },
  { label: '\u533a\u57df\u505c\u7559', value: 'dwell' },
];

export const LINE_DIRECTION_OPTIONS: Array<{ label: string; value: DynamicLineDirection }> = [
  { label: '\u53cc\u5411', value: 'both' },
  { label: 'A -> B', value: 'a_to_b' },
  { label: 'B -> A', value: 'b_to_a' },
];

export const OPERATOR_OPTIONS: Array<{ label: string; value: AlertRuleOperator }> = [
  { label: '<', value: '<' },
  { label: '>', value: '>' },
  { label: '<=', value: '<=' },
  { label: '>=', value: '>=' },
  { label: '==', value: '==' },
];

const SEVERITY_LABEL_MAP: Record<string, string> = {
  low: '三级',
  medium: '二级',
  high: '一级',
};

const SEVERITY_COLOR_MAP: Record<string, string> = {
  low: 'default',
  medium: 'orange',
  high: 'red',
};

export function getSeverityLabel(severity?: string) {
  if (!severity)
    return '未设置';
  return SEVERITY_LABEL_MAP[severity] ?? severity;
}

export function getSeverityColor(severity?: string) {
  if (!severity)
    return 'default';
  return SEVERITY_COLOR_MAP[severity] ?? 'default';
}

export function getAlertBehaviorLabel(type?: AlertRuleBehaviorType) {
  return ALERT_BEHAVIOR_LABEL_MAP[type ?? 'static_count'] ?? '\u9759\u6001\u68c0\u6d4b';
}

export function formatDynamicTrigger(rule: AlertRuleDraft): string {
  if ((rule.behavior_type ?? 'static_count') === 'static_count')
    return rule.logic_expression?.trim() || '\u6309\u68c0\u6d4b\u6761\u4ef6\u5224\u65ad';
  if (rule.behavior_type === 'intrusion')
    return rule.dynamic_trigger?.mode === 'stay'
      ? `\u8fdb\u5165\u533a\u57df\u5e76\u505c\u7559 ${rule.dynamic_trigger?.dwell_sec ?? 3} \u79d2`
      : '\u76ee\u6807\u8fdb\u5165\u533a\u57df';
  if (rule.behavior_type === 'dwell')
    return `\u533a\u57df\u5185\u505c\u7559 ${rule.dynamic_trigger?.dwell_sec ?? rule.duration_sec ?? 3} \u79d2\uff0c\u89e6\u53d1\u6570\u91cf ${rule.dynamic_trigger?.crowd_count ?? 1}`;
  if (rule.behavior_type === 'line_crossing') {
    const direction = LINE_DIRECTION_OPTIONS.find(item => item.value === rule.dynamic_geometry?.direction)?.label ?? '\u53cc\u5411';
    return `\u7a7f\u8d8a\u7ebf\u6bb5\uff08${direction}\uff09`;
  }
  return '\u52a8\u6001\u8ffd\u8e2a\u5224\u65ad';
}

export function getClassOptionsFromDraft(draft: AlgorithmTaskDraft) {
  return getAlertClassOptionsForDraftModels(draft);
}


export const DEFAULT_CLIP_BEFORE_SEC = 10;
export const DEFAULT_CLIP_AFTER_SEC = 10;

const DEFAULT_DYNAMIC_TRIGGER = {
  mode: 'enter' as const,
  dwell_sec: 3,
  extract_interval: 25,
  lost_track_buffer: 25,
  matching_threshold: 0.8,
  same_track_suppress_sec: 300,
  enter_confirm_frames: 2,
  allow_leave_sec: 1,
  crowd_count: 1,
  max_speed_jump: 0,
  smooth_alpha: 0.25,
  lock_class: true,
};

export function ensureClipRecordDefaults(rule: AlertRuleDraft) {
  if (!rule.clip_record_enabled)
    return;
  if (rule.clip_before_sec == null)
    rule.clip_before_sec = DEFAULT_CLIP_BEFORE_SEC;
  if (rule.clip_after_sec == null)
    rule.clip_after_sec = DEFAULT_CLIP_AFTER_SEC;
}

export function clearClipRecordSeconds(rule: AlertRuleDraft) {
  rule.clip_before_sec = undefined;
  rule.clip_after_sec = undefined;
}

export function getNextRuleSeq(rules: AlertRuleDraft[]): number {
  return rules.length + 1;
}

export function getRuleSeqDisplay(rule: AlertRuleDraft, index: number): number {
  return rule.rule_seq ?? index + 1;
}

/** 按列表顺序将规则序号重排为 1、2、3… */
export function renumberAlertRules(rules: AlertRuleDraft[]): void {
  rules.forEach((rule, index) => {
    rule.rule_seq = index + 1;
  });
}

export function assignNextRuleSeq(rule: AlertRuleDraft, existingRules: AlertRuleDraft[]): void {
  rule.rule_seq = getNextRuleSeq(existingRules);
}

export function createBlankCondition(seq = 1, modelId: number | null = null): AlertRuleConditionDraft {
  return {
    seq,
    model_id: modelId,
    model_name: undefined,
    class_name: '',
    operator: undefined,
    count: undefined,
  };
}

export function createEmptyAlertRule(existingRuleCount: number): AlertRuleDraft {
  const conditions = [createBlankCondition(1)];
  return {
    rule_id: `rule_${Date.now()}_${existingRuleCount}`,
    behavior_type: 'static_count',
    rule_name: '',
    enabled: true,
    scope: {
      type: 'full_frame',
      region_id: null,
      line_id: null,
    },
    conditions,
    duration_sec: 3,
    alarm_suppress_time: 300,
    logic_expression: '',
    logic: 'AND',
    severity: 'low',
    clip_record_enabled: false,
    clip_before_sec: DEFAULT_CLIP_BEFORE_SEC,
    clip_after_sec: DEFAULT_CLIP_AFTER_SEC,
  };
}

export function createEmptyDynamicAlertRule(existingRuleCount: number): AlertRuleDraft {
  const rule = createEmptyAlertRule(existingRuleCount);
  return {
    ...rule,
    behavior_type: 'intrusion',
    rule_name: '',
    target_model_id: null,
    target_classes: [],
    scope: {
      type: 'region',
      region_id: null,
      line_id: null,
    },
    dynamic_geometry: {
      type: 'polygon',
      points: [],
    },
    dynamic_trigger: {
      ...DEFAULT_DYNAMIC_TRIGGER,
    },
    duration_sec: 0,
  };
}

export function cloneAlertRule(rule: AlertRuleDraft): AlertRuleDraft {
  const cloned = migrateAlertRule({
    ...rule,
    scope: { ...rule.scope },
    conditions: rule.conditions.map(condition => ({ ...condition })),
    target_classes: [...(rule.target_classes ?? [])],
    dynamic_geometry: rule.dynamic_geometry
      ? {
          ...rule.dynamic_geometry,
          points: rule.dynamic_geometry.points.map(point => [...point]),
        }
      : undefined,
    dynamic_trigger: rule.dynamic_trigger ? { ...rule.dynamic_trigger } : undefined,
  });
  if (cloned.clip_record_enabled)
    ensureClipRecordDefaults(cloned);
  return cloned;
}

export function normalizeDynamicAlertRuleBeforeSave(rule: AlertRuleDraft): AlertRuleDraft {
  const modelId = rule.target_model_id ?? rule.conditions[0]?.model_id ?? null;
  const firstClass = rule.target_classes?.[0] ?? rule.conditions[0]?.class_name ?? '';
  const normalized = cloneAlertRule({
    ...rule,
    target_model_id: modelId,
    target_classes: [...(rule.target_classes ?? [])],
    conditions: [
      {
        seq: 1,
        model_id: modelId,
        model_name: rule.conditions[0]?.model_name,
        class_name: firstClass,
        operator: '>=',
        count: 1,
      },
    ],
    logic_expression: '1',
  });

  if (normalized.behavior_type === 'line_crossing') {
    normalized.scope.type = 'line';
    normalized.dynamic_geometry = {
      type: 'line',
      points: normalized.dynamic_geometry?.points ?? [],
      direction: normalized.dynamic_geometry?.direction ?? 'both',
    };
    normalized.dynamic_trigger = {
      mode: 'cross',
      ...DEFAULT_DYNAMIC_TRIGGER,
      ...normalized.dynamic_trigger,
      mode: 'cross',
    };
  }
  else {
    normalized.scope.type = 'region';
    normalized.dynamic_geometry = {
      type: 'polygon',
      points: normalized.dynamic_geometry?.points ?? [],
    };
    normalized.dynamic_trigger = {
      ...DEFAULT_DYNAMIC_TRIGGER,
      ...normalized.dynamic_trigger,
      mode: normalized.behavior_type === 'dwell' ? 'stay' : (normalized.dynamic_trigger?.mode ?? 'enter'),
      dwell_sec: normalized.behavior_type === 'intrusion' && normalized.dynamic_trigger?.mode === 'enter'
        ? 0
        : (normalized.dynamic_trigger?.dwell_sec ?? normalized.duration_sec ?? 3),
      allow_leave_sec: normalized.behavior_type === 'intrusion' && normalized.dynamic_trigger?.mode === 'enter'
        ? 0
        : (normalized.dynamic_trigger?.allow_leave_sec ?? 1),
      crowd_count: normalized.behavior_type === 'dwell'
        ? (normalized.dynamic_trigger?.crowd_count ?? 1)
        : 1,
    };
  }

  if (normalized.dynamic_trigger) {
    delete (normalized.dynamic_trigger as Record<string, unknown>).min_confidence;
    delete (normalized.dynamic_trigger as Record<string, unknown>).min_track_confidence;
    delete (normalized.dynamic_trigger as Record<string, unknown>).min_box_area;
    delete (normalized.dynamic_trigger as Record<string, unknown>).min_track_hits;
    delete (normalized.dynamic_trigger as Record<string, unknown>).leave_reset_sec;
    delete (normalized.dynamic_trigger as Record<string, unknown>).target_point;
    delete (normalized.dynamic_trigger as Record<string, unknown>).dwell_mode;
    delete (normalized.dynamic_trigger as Record<string, unknown>).crowd_mode;
  }

  return normalizeAlertRuleBeforeSave(normalized);
}

export function validateDynamicAlertRule(rule: AlertRuleDraft): string | null {
  if (!rule.rule_name?.trim())
    return '\u8bf7\u586b\u5199\u89c4\u5219\u540d\u79f0';
  if (!rule.severity)
    return '\u8bf7\u9009\u62e9\u544a\u8b66\u7b49\u7ea7';
  if (!rule.behavior_type || rule.behavior_type === 'static_count')
    return '\u8bf7\u9009\u62e9\u52a8\u6001\u89c4\u5219\u7c7b\u578b';
  if (rule.target_model_id == null)
    return '\u8bf7\u9009\u62e9\u76ee\u6807\u7b97\u6cd5';
  if (!rule.target_classes?.length)
    return '\u8bf7\u9009\u62e9\u76ee\u6807\u7c7b\u522b';
  if ((rule.behavior_type === 'dwell' || rule.dynamic_trigger?.mode === 'stay')
    && (!rule.dynamic_trigger?.dwell_sec || rule.dynamic_trigger.dwell_sec < 1))
    return '\u8bf7\u586b\u5199\u505c\u7559\u89e6\u53d1\u79d2\u6570';
  if (!rule.dynamic_trigger?.extract_interval || rule.dynamic_trigger.extract_interval < 1)
    return '\u8bf7\u586b\u5199\u62bd\u5e27\u95f4\u9694';
  if (!rule.dynamic_trigger?.lost_track_buffer || rule.dynamic_trigger.lost_track_buffer < 1)
    return '\u8bf7\u586b\u5199\u76ee\u6807\u4e22\u5931\u4fdd\u7559\u5e27\u6570';
  if (rule.dynamic_trigger.matching_threshold == null || rule.dynamic_trigger.matching_threshold <= 0 || rule.dynamic_trigger.matching_threshold > 1)
    return '\u8bf7\u586b\u51990-1\u4e4b\u95f4\u7684\u8f68\u8ff9\u5339\u914d\u9608\u503c';
  if (rule.dynamic_trigger.same_track_suppress_sec == null || rule.dynamic_trigger.same_track_suppress_sec < 0)
    return '\u8bf7\u586b\u5199\u76f8\u540c\u76ee\u6807\u91cd\u590d\u544a\u8b66\u6291\u5236';
  if (rule.behavior_type === 'intrusion' && (!rule.dynamic_trigger.enter_confirm_frames || rule.dynamic_trigger.enter_confirm_frames < 1))
    return '\u8bf7\u586b\u5199\u8fdb\u5165\u786e\u8ba4\u5e27\u6570';
  if ((rule.behavior_type === 'dwell' || rule.dynamic_trigger.mode === 'stay')
    && (rule.dynamic_trigger.allow_leave_sec == null || rule.dynamic_trigger.allow_leave_sec < 0))
    return '\u8bf7\u586b\u5199\u77ed\u6682\u79bb\u5f00\u5bb9\u5fcd\u65f6\u95f4';
  if (rule.behavior_type === 'dwell' && (!rule.dynamic_trigger.crowd_count || rule.dynamic_trigger.crowd_count < 1))
    return '\u8bf7\u586b\u5199\u89e6\u53d1\u6570\u91cf';
  if (rule.alarm_suppress_time == null || rule.alarm_suppress_time < 0)
    return '\u8bf7\u586b\u5199\u544a\u8b66\u6291\u5236\u65f6\u95f4\uff08\u79d2\uff09';
  if (rule.clip_record_enabled) {
    if (rule.clip_before_sec == null || rule.clip_before_sec < 0)
      return '\u8bf7\u586b\u5199\u5f55\u50cf\u7247\u6bb5\u300c\u524d\u591a\u5c11\u79d2\u300d';
    if (rule.clip_after_sec == null || rule.clip_after_sec < 0)
      return '\u8bf7\u586b\u5199\u5f55\u50cf\u7247\u6bb5\u300c\u540e\u591a\u5c11\u79d2\u300d';
  }
  return null;
}

export function validateAlertRule(rule: AlertRuleDraft): string | null {
  if (!rule.rule_name?.trim())
    return '请填写规则名称';
  if (!rule.severity)
    return '请选择告警等级';
  if (rule.duration_sec == null || rule.duration_sec < 0)
    return '请填写持续时间（秒）';
  if (rule.alarm_suppress_time == null || rule.alarm_suppress_time < 0)
    return '请填写告警抑制时间（秒）';
  if (!rule.conditions.length)
    return '请至少添加一条检测条件';

  for (let i = 0; i < rule.conditions.length; i++) {
    const condition = rule.conditions[i];
    if (condition.model_id == null)
      return `第 ${i + 1} 行：请选择算法名称`;
    if (!condition.class_name)
      return `第 ${i + 1} 行：请选择检测类别`;
    if (!condition.operator)
      return `第 ${i + 1} 行：请选择判断关系`;
    if (condition.count == null || condition.count < 0)
      return `第 ${i + 1} 行：请填写数量`;
  }

  const exprError = rule.logic_expression?.trim()
    ? validateLogicExpression(rule.logic_expression, rule.conditions)
    : null;
  if (exprError)
    return exprError;

  if (rule.clip_record_enabled) {
    if (rule.clip_before_sec == null || rule.clip_before_sec < 0)
      return '请填写录像片段「前多少秒」';
    if (rule.clip_after_sec == null || rule.clip_after_sec < 0)
      return '请填写录像片段「后多少秒」';
  }

  return null;
}

export function selectPopupContainer() {
  return document.body;
}

export const SELECT_DROPDOWN_STYLE = { zIndex: 4100 };

// ---- from alertPushUtils.ts ----
import type {
  AlertPushChannel,
  AlertPushContentField,
  AlertPushDraft,
  AlertPushMode,
  AlertRuleDraft,
} from '../algorithmTaskDraft.types';
import {
  ensureChannelProfileDefaults,
  resolveAlertPushForSubmit as resolvePushProfiles,
  truncatePushUrl,
} from '@/views/alert/utils/pushUtils';
import { getPushProfiles } from '@/views/alert/utils/mockPushSettingsStore';
import type { PushChannelProfile } from '@/views/alert/pushSettings.types';

export { resolveAlertPushForSubmit } from '@/views/alert/utils/pushUtils';

export const CHANNEL_OPTIONS: Array<{ label: string; value: AlertPushChannel }> = [
  { label: '邮件', value: 'email' },
  { label: '短信', value: 'sms' },
  { label: '微信', value: 'wechat' },
  { label: '飞书', value: 'feishu' },
  { label: '钉钉', value: 'dingtalk' },
];

/** 推送设置页渠道类型（不含平台站内） */
export const PUSH_SETTINGS_CHANNEL_OPTIONS = [...CHANNEL_OPTIONS];

export const PUSH_MODE_OPTIONS: Array<{ label: string; value: AlertPushMode }> = [
  { label: '按用户推送', value: 'user' },
  { label: '推送地址', value: 'address' },
];

export const CONTENT_FIELD_OPTIONS: Array<{ label: string; value: AlertPushContentField }> = [
  { label: '任务名称', value: 'task_name' },
  { label: '摄像头名称', value: 'camera_name' },
  { label: '告警规则序号', value: 'rule_seq' },
  { label: '告警规则名称', value: 'rule_name' },
  { label: '告警等级', value: 'severity' },
  { label: '告警时间', value: 'alarm_time' },
  { label: '检测摘要', value: 'detection_summary' },
  { label: '告警截图', value: 'snapshot_image' },
  { label: '区域名称', value: 'region_name' },
];

export function getPushModeLabel(mode?: AlertPushMode): string {
  return PUSH_MODE_OPTIONS.find(item => item.value === mode)?.label ?? '按用户推送';
}

export function isUserPushMode(push: AlertPushDraft): boolean {
  return push.push_mode !== 'address';
}

export function getChannelLabel(channel: AlertPushChannel): string {
  const labels: Record<string, string> = {
    platform: '平台站内',
    email: '邮件',
    sms: '短信',
    wechat: '微信',
    feishu: '飞书',
    dingtalk: '钉钉',
  };
  return labels[channel] ?? CHANNEL_OPTIONS.find(item => item.value === channel)?.label ?? channel;
}

export function formatChannels(channels: AlertPushChannel[]): string {
  if (!channels.length) {
    return '--';
  }
  return channels.map(getChannelLabel).join('、');
}

export function formatRecipientUserIds(
  userIds: number[] | undefined,
  userLabelMap?: Map<number, string>,
): string {
  const ids = userIds ?? [];
  if (!ids.length)
    return '--';
  if (!userLabelMap?.size)
    return `${ids.length} 个用户`;
  return ids.map(id => userLabelMap.get(id) ?? String(id)).join('、');
}

export function formatAddressProfileIds(
  profileIds: string[] | undefined,
  profileLabelMap?: Map<string, string>,
): string {
  const ids = profileIds ?? [];
  if (!ids.length)
    return '--';
  if (!profileLabelMap?.size)
    return `${ids.length} 个地址`;
  return ids.map(id => profileLabelMap.get(id) ?? id).join('、');
}

export function buildAlertRuleSelectOptions(rules: AlertRuleDraft[]) {
  return rules.map((rule, index) => ({
    value: rule.rule_id,
    label: `${getRuleSeqDisplay(rule, index)}. ${rule.rule_name?.trim() || '未命名规则'}`,
  }));
}

export function formatAlertRuleIds(
  ruleIds: string[] | undefined,
  rules: AlertRuleDraft[],
): string {
  const ids = ruleIds ?? [];
  if (!ids.length)
    return '--';
  const ruleMap = new Map(rules.map((rule, index) => [
    rule.rule_id,
    `${getRuleSeqDisplay(rule, index)}. ${rule.rule_name?.trim() || '未命名规则'}`,
  ]));
  return ids.map(id => ruleMap.get(id) ?? id).join('、');
}

export function buildAddressProfileOptions(profiles: PushChannelProfile[] = getPushProfiles()) {
  return profiles
    .filter(item => item.enabled)
    .map(item => ({
      label: `${item.profile_name}（${truncatePushUrl(item.push_url, 36)}）`,
      value: item.profile_id,
    }));
}

export function createEmptyAlertPush(index: number): AlertPushDraft {
  return {
    push_id: `push_${Date.now()}_${index}`,
    push_name: '',
    enabled: true,
    push_mode: 'user',
    channels: ['email'],
    channel_profile_map: {},
    content: {
      title_template: '',
      include_fields: ['task_name', 'camera_name', 'rule_seq', 'rule_name', 'severity', 'alarm_time'],
      remark: '',
    },
    recipient_user_ids: [],
    address_profile_ids: [],
    rule_ids: [],
  };
}

export function cloneAlertPush(push: AlertPushDraft): AlertPushDraft {
  const cloned = JSON.parse(JSON.stringify(push)) as AlertPushDraft;
  if (!cloned.channel_profile_map)
    cloned.channel_profile_map = {};
  cloned.channels = (cloned.channels ?? []).filter(ch => ch !== 'platform');
  if (!cloned.push_mode)
    cloned.push_mode = 'user';
  if (!cloned.recipient_user_ids)
    cloned.recipient_user_ids = [];
  if (!cloned.address_profile_ids)
    cloned.address_profile_ids = [];
  if (!cloned.rule_ids)
    cloned.rule_ids = [];
  return cloned;
}

export function validateAlertPush(
  push: AlertPushDraft,
  options?: { requireRules?: boolean },
): string | null {
  if (options?.requireRules !== false && !push.rule_ids?.length) {
    return '请至少选择一条告警规则';
  }
  if (!push.push_name?.trim()) {
    return '请填写推送名称';
  }

  if (isUserPushMode(push)) {
    if (!push.channels.length) {
      return '请至少选择一种推送渠道';
    }
    if (!push.recipient_user_ids?.length) {
      return '请选择推送用户';
    }
    if (!push.content.include_fields.length) {
      return '请至少选择一项推送内容';
    }
    if (!push.content.title_template?.trim()) {
      return '请填写推送标题';
    }
  }
  else if (!push.address_profile_ids?.length) {
    return '请选择推送地址';
  }

  return null;
}

export function normalizeAlertPushBeforeSave(push: AlertPushDraft): AlertPushDraft {
  const cloned = cloneAlertPush(push);
  cloned.push_name = cloned.push_name.trim();

  if (cloned.push_mode === 'address') {
    cloned.recipient_user_ids = [];
    cloned.channels = [];
    cloned.channel_profile_map = {};
    return cloned;
  }

  cloned.address_profile_ids = [];
  cloned.content.title_template = cloned.content.title_template.trim();
  return cloned;
}

export function buildPushPreview(
  push: AlertPushDraft,
  _taskName = '示例任务',
  userLabelMap?: Map<number, string>,
  profileLabelMap?: Map<string, string>,
  alertRules: AlertRuleDraft[] = [],
): string {
  const modeLine = `推送模式：${getPushModeLabel(push.push_mode)}`;
  const rulesLine = `关联规则：${formatAlertRuleIds(push.rule_ids, alertRules)}`;

  if (!isUserPushMode(push)) {
    const addresses = formatAddressProfileIds(push.address_profile_ids, profileLabelMap);
    return `${modeLine}\n${rulesLine}\n推送地址：${addresses}`;
  }

  const fieldLabels = push.content.include_fields
    .map(field => CONTENT_FIELD_OPTIONS.find(item => item.value === field)?.label ?? field);
  const title = push.content.title_template.trim() || '（未填写推送标题）';
  const body = fieldLabels.map(label => `${label}：示例值`).join('\n');
  const remark = push.content.remark?.trim();
  const channels = formatChannels(push.channels);
  const recipients = formatRecipientUserIds(push.recipient_user_ids, userLabelMap);
  const targetLine = `推送渠道：${channels}\n推送用户：${recipients}`;
  const content = remark ? `${title}\n\n${body}\n\n${remark}` : `${title}\n\n${body}`;
  return `${modeLine}\n${rulesLine}\n${targetLine}\n\n${content}`;
}

export function resolveAlertPushConfigsForSubmit(configs: AlertPushDraft[]): AlertPushDraft[] {
  return configs.map((push) => {
    const normalized = normalizeAlertPushBeforeSave(push);
    const withDefaults = ensureChannelProfileDefaults(normalized);
    return resolvePushProfiles(withDefaults);
  });
}
