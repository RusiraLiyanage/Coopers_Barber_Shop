type RuntimeConfigKey = 'VITE_API_URL';

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

