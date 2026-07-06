type RuntimeConfigKey =
  | 'VITE_API_URL'
  | 'VITE_SESSION_IDLE_TIMEOUT_SECONDS'
  | 'VITE_SESSION_EXTENSION_GRACE_SECONDS';

type RuntimeConfig = Partial<Record<RuntimeConfigKey, string>>;

declare global {
  interface Window {
    __COOPERS_RUNTIME_CONFIG__?: RuntimeConfig;
  }
}

export function getRuntimeConfigValue(
  key: RuntimeConfigKey,
  fallback = '',
): string {
  return window.__COOPERS_RUNTIME_CONFIG__?.[key] ?? fallback;
}
