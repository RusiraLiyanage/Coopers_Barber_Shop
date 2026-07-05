const DEFAULT_ALERT_THROTTLE_SECONDS = 300;
const DEFAULT_HTTP_ALERT_MIN_STATUS = 400;
const runtimeAlertLastSentAt = new Map<string, number>();

export type RuntimeAlertSeverity = 'error' | 'warning';

export type RuntimeAlertInput = {
  category: string;
  detail: string;
  error?: unknown;
  method?: string;
  path?: string;
  serviceName?: string;
  severity?: RuntimeAlertSeverity;
  statusCode?: number;
  statusText?: string;
  throttleSeconds?: number;
};

function parsePositiveInteger(
  value: string | undefined,
  fallback: number,
): number {
  const parsed = Number(value);

  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function getRuntimeServiceName(serviceName?: string): string {
  return (
    serviceName ||
    process.env.SLACK_RUNTIME_ERROR_SERVICE_NAME ||
    process.env.SERVICE_CONFIG_NAME ||
    process.env.APP_CONFIG_APPLICATION ||
    process.env.npm_package_name ||
    'unknown-service'
  );
}

function getRuntimeEnvironment(): string {
  return process.env.ENV || process.env.NODE_ENV || 'unknown';
}

function formatError(error: unknown): string | undefined {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  if (error === undefined || error === null) {
    return undefined;
  }

  return String(error);
}

function truncateSlackValue(value: string, maxLength = 600): string {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 3)}...`;
}

function escapeSlackCode(value: string): string {
  return truncateSlackValue(value).replace(/`/g, "'");
}

function resolveThrottleSeconds(input: RuntimeAlertInput): number {
  if (input.throttleSeconds !== undefined) {
    return input.throttleSeconds;
  }

  return parsePositiveInteger(
    process.env.SLACK_RUNTIME_ERROR_THROTTLE_SECONDS,
    DEFAULT_ALERT_THROTTLE_SECONDS,
  );
}

function shouldSendRuntimeAlert(input: RuntimeAlertInput): boolean {
  const webhookUrl = process.env.SLACK_RUNTIME_ERROR_WEBHOOK_URL;

  if (!webhookUrl) {
    return false;
  }

  if (input.statusCode !== undefined) {
    const minStatus = parsePositiveInteger(
      process.env.SLACK_RUNTIME_ERROR_MIN_STATUS,
      DEFAULT_HTTP_ALERT_MIN_STATUS,
    );

    if (input.statusCode < minStatus) {
      return false;
    }
  }

  const alertKey = [
    getRuntimeServiceName(input.serviceName),
    input.severity ?? 'error',
    input.category,
    input.statusCode ?? '',
    input.method ?? '',
    input.path ?? '',
    input.detail,
    formatError(input.error) ?? '',
  ].join('|');
  const now = Date.now();
  const lastSentAt = runtimeAlertLastSentAt.get(alertKey) ?? 0;

  if (now - lastSentAt < resolveThrottleSeconds(input) * 1000) {
    return false;
  }

  runtimeAlertLastSentAt.set(alertKey, now);
  return true;
}

export function sendRuntimeAlert(input: RuntimeAlertInput): void {
  const webhookUrl = process.env.SLACK_RUNTIME_ERROR_WEBHOOK_URL;

  if (!webhookUrl || !shouldSendRuntimeAlert(input)) {
    return;
  }

  const severity = input.severity ?? 'error';
  const problem = formatError(input.error) ?? input.detail;
  const route = [input.method, input.path].filter(Boolean).join(' ') || '-';
  const status =
    input.statusCode === undefined
      ? '-'
      : `${input.statusCode} ${input.statusText ?? ''}`.trim();
  const payload = {
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text:
            severity === 'warning'
              ? ':warning: *Runtime Warning* :warning:'
              : ':rotating_light: *Runtime Error* :rotating_light:',
        },
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Service:*\n${getRuntimeServiceName(input.serviceName)}`,
          },
          {
            type: 'mrkdwn',
            text: `*Environment:*\n${getRuntimeEnvironment()}`,
          },
          {
            type: 'mrkdwn',
            text: `*Category:*\n${input.category}`,
          },
          {
            type: 'mrkdwn',
            text: `*Status:*\n${status}`,
          },
          {
            type: 'mrkdwn',
            text: `*Route:*\n${route}`,
          },
          {
            type: 'mrkdwn',
            text: `*Severity:*\n${severity}`,
          },
        ],
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Problem:*\n\`${escapeSlackCode(problem)}\``,
        },
      },
    ],
  };

  void fetch(webhookUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  }).catch((alertError: unknown) => {
    const alertMessage = formatError(alertError) ?? 'Unknown Slack alert error';

    console.error('Slack runtime alert failed:', alertMessage);
  });
}
