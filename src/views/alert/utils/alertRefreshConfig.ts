export type AlertRefreshConfig = {
  enabled: boolean;
  intervalSeconds: number;
};

const STORAGE_KEY = 'alert_events_refresh_config_v1';
const MIN_INTERVAL_SECONDS = 3;
const MAX_INTERVAL_SECONDS = 300;

export const DEFAULT_ALERT_REFRESH_CONFIG: AlertRefreshConfig = {
  enabled: true,
  intervalSeconds: 10,
};

function clampInterval(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed))
    return DEFAULT_ALERT_REFRESH_CONFIG.intervalSeconds;
  return Math.min(MAX_INTERVAL_SECONDS, Math.max(MIN_INTERVAL_SECONDS, Math.round(parsed)));
}

export function loadAlertRefreshConfig(): AlertRefreshConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw)
      return { ...DEFAULT_ALERT_REFRESH_CONFIG };
    const parsed = JSON.parse(raw);
    return {
      enabled: parsed?.enabled !== false,
      intervalSeconds: clampInterval(parsed?.intervalSeconds),
    };
  }
  catch {
    return { ...DEFAULT_ALERT_REFRESH_CONFIG };
  }
}

export function saveAlertRefreshConfig(config: AlertRefreshConfig): AlertRefreshConfig {
  const normalized: AlertRefreshConfig = {
    enabled: config.enabled !== false,
    intervalSeconds: clampInterval(config.intervalSeconds),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
}

export function getRefreshIntervalMs(config: AlertRefreshConfig): number {
  return clampInterval(config.intervalSeconds) * 1000;
}
