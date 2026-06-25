import { AppEnvironment, getAppEnvironment } from '../configs/app.config';

// this service helps to check for the system health when it's in production.

export type HealthStatus = 'ok';

export type HealthCheckResult = Record<
  string,
  boolean | number | string | undefined
>;

export type HealthResponse = {
  service: string;
  status: HealthStatus;
  environment: AppEnvironment;
  timestamp: string;
  uptimeSeconds: number;
  checks?: Record<string, HealthCheckResult>;
};

export function createHealthResponse(
  service: string,
  checks?: Record<string, HealthCheckResult>,
): HealthResponse {
  return {
    service,
    status: 'ok',
    environment: getAppEnvironment(),
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()), // process is from the node js object
    ...(checks ? { checks } : {}),
  };
}
