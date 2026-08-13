/** 告警列表展示辅助 */

export type UiProcessStatus = 'pending' | 'processed' | 'false_alarm';
export type UiArchiveStatus = 'none' | 'correct' | 'incorrect';

export type AlertUiState = {
  process: Record<number, UiProcessStatus>;
  archive: Record<number, UiArchiveStatus | 'archived'>;
};

const UI_STATE_KEY = 'alert_ui_state_v1';

function normalizeArchiveStatus(value: unknown): UiArchiveStatus {
  if (value === 'archived' || value === 'correct')
    return 'correct';
  if (value === 'incorrect')
    return 'incorrect';
  return 'none';
}

export function loadAlertUiState(): AlertUiState {
  try {
    const raw = localStorage.getItem(UI_STATE_KEY);
    if (!raw)
      return { process: {}, archive: {} };
    const parsed = JSON.parse(raw);
    const archive: AlertUiState['archive'] = {};
    for (const [id, value] of Object.entries(parsed?.archive ?? {})) {
      archive[Number(id)] = normalizeArchiveStatus(value);
    }
    return {
      process: parsed?.process ?? {},
      archive,
    };
  }
  catch {
    return { process: {}, archive: {} };
  }
}

export function saveAlertUiState(state: AlertUiState) {
  localStorage.setItem(UI_STATE_KEY, JSON.stringify(state));
}

export function parseInformation(raw: unknown): Record<string, any> | null {
  if (!raw)
    return null;
  if (typeof raw === 'object')
    return raw as Record<string, any>;
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return typeof parsed === 'object' && parsed ? parsed as Record<string, any> : null;
    }
    catch {
      return null;
    }
  }
  return null;
}

/** 报警等级：优先 information.severity，否则默认三级（演示用） */
export function resolveSeverityLevel(record: Record<string, any>): { label: string; color: string } {
  const info = parseInformation(record.information);
  const severity = info?.severity ?? record.severity;
  const map: Record<string, { label: string; color: string }> = {
    high: { label: '一级', color: 'red' },
    medium: { label: '二级', color: 'orange' },
    low: { label: '三级', color: 'gold' },
    一级: { label: '一级', color: 'red' },
    二级: { label: '二级', color: 'orange' },
    三级: { label: '三级', color: 'gold' },
  };
  if (severity && map[String(severity)])
    return map[String(severity)];
  return { label: '三级', color: 'gold' };
}

export function buildExtraInfoSummary(record: Record<string, any>): string {
  const parts: string[] = [];
  if (record.object)
    parts.push(`对象:${record.object}`);
  if (record.region)
    parts.push(`区域:${record.region}`);
  const info = parseInformation(record.information);
  if (info?.total_count != null)
    parts.push(`目标数:${info.total_count}`);
  if (info?.object_counts && typeof info.object_counts === 'object') {
    const counts = Object.entries(info.object_counts)
      .map(([k, v]) => `${k}×${v}`)
      .join(', ');
    if (counts)
      parts.push(counts);
  }
  return parts.length ? parts.join(' · ') : '--';
}

export function resolveRuleName(record: Record<string, any>): string {
  const info = parseInformation(record.information);
  const rule = info?.rule && typeof info.rule === 'object' ? info.rule : null;
  const name = record.rule_name
    ?? info?.rule_name
    ?? info?.alert_rule_name
    ?? rule?.rule_name
    ?? rule?.name;
  return name ? String(name) : '--';
}

export function resolveAlertDescription(record: Record<string, any>): string {
  const info = parseInformation(record.information);
  const desc = record.alert_description
    ?? record.description
    ?? info?.description
    ?? info?.alert_description
    ?? info?.message;
  if (desc && String(desc).trim())
    return String(desc).trim();
  return buildExtraInfoSummary(record);
}

function resolveAlertStorageUrl(path: unknown): string {
  if (!path)
    return '';

  const normalized = String(path).replaceAll('\\', '/');
  if (normalized.startsWith('http://') || normalized.startsWith('https://'))
    return normalized;
  if (normalized.startsWith('/api/v1/buckets'))
    return `${window.location.origin}${normalized}`;

  const marker = 'alert_images/';
  const idx = normalized.indexOf(marker);
  if (idx >= 0) {
    const rel = normalized.slice(idx + marker.length);
    const apiBase = (import.meta.env.VITE_GLOB_API_URL || '/dev-api').replace(/\/$/, '');
    return `${apiBase}/video/alert/static/${rel}`;
  }

  if (normalized.startsWith('/'))
    return `${window.location.origin}${normalized}`;

  return normalized;
}

export function resolveAlertImageUrl(record: Record<string, any>): string {
  return resolveAlertStorageUrl(record.image_url) || resolveAlertStorageUrl(record.image_path);
}

export function hasRecordClip(record: Record<string, any>): boolean {
  return !!(record.record_path && String(record.record_path).trim());
}

export function getRecordClipStatus(record: Record<string, any>): 'ready' | 'generating' | 'failed' | 'none' {
  if (hasRecordClip(record))
    return 'ready';
  const info = parseInformation(record.information);
  const clipRecord = info?.clip_record;
  if (clipRecord && typeof clipRecord === 'object' && clipRecord.enabled) {
    const status = String(clipRecord.status || '').toLowerCase();
    if (status === 'generating' || status === 'pending')
      return 'generating';
    if (status === 'failed' || status === 'error')
      return 'failed';
  }
  return 'none';
}

export function getProcessStatus(
  record: Record<string, any>,
  uiState: AlertUiState,
): { label: string; color: string; value: UiProcessStatus } {
  const raw = record.process_status ?? uiState.process[record.id] ?? 'pending';
  const value: UiProcessStatus = raw === 'processed' || raw === 'false_alarm' ? raw : 'pending';
  const map: Record<UiProcessStatus, { label: string; color: string }> = {
    pending: { label: '未处理', color: 'error' },
    processed: { label: '已处理', color: 'success' },
    false_alarm: { label: '误报', color: 'default' },
  };
  return { ...map[value], value };
}

export function getArchiveStatus(
  record: Record<string, any>,
  uiState: AlertUiState,
): { label: string; color: string; badgeStatus: 'default' | 'success' | 'error'; value: UiArchiveStatus } {
  const raw = record.archive_status ?? uiState.archive[record.id];
  const value = normalizeArchiveStatus(raw);
  const map: Record<UiArchiveStatus, { label: string; color: string; badgeStatus: 'default' | 'success' | 'error' }> = {
    none: { label: '暂未归档', color: 'default', badgeStatus: 'default' },
    correct: { label: '正确报警', color: 'success', badgeStatus: 'success' },
    incorrect: { label: '错误报警', color: 'error', badgeStatus: 'error' },
  };
  return { ...map[value], value };
}

export function exportAlertsToCsv(rows: Record<string, any>[], uiState: AlertUiState) {
  const header = [
    '任务名称',
    '摄像头名称',
    '报警规则名称',
    '报警描述',
    '报警时间',
    '报警等级',
    '处理状态',
    '归档状态',
  ];
  const lines = rows.map((record) => {
    const cols = [
      record.event ?? record.object ?? '',
      record.device_name ?? '',
      resolveRuleName(record),
      resolveAlertDescription(record),
      record.time ?? '',
      resolveSeverityLevel(record).label,
      getProcessStatus(record, uiState).label,
      getArchiveStatus(record, uiState).label,
    ];
    return cols.map(v => `"${String(v).replaceAll('"', '""')}"`).join(',');
  });
  const blob = new Blob([`\uFEFF${header.join(',')}\n${lines.join('\n')}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `报警日志_${Date.now()}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
