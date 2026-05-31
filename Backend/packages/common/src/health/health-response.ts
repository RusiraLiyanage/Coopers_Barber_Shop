import { AppEnvironment, getAppEnvironment } from '../configs/app.config';

export type HealthStatus = 'ok';

export type HealthResponse = {
  service: string;
  status: HealthStatus;
  environment: AppEnvironment;
  timestamp: string;
  uptimeSeconds: number;
};

export function createHealthResponse(service: string): HealthResponse {
  return {
    service,
    status: 'ok',
    environment: getAppEnvironment(),
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
  };
}
