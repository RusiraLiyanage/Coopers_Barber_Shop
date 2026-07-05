import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ADMIN_REALTIME_DATA_CHANGED_PATH,
  INTERNAL_GATEWAY_SECRET_HEADER,
  joinServiceUrl,
  sendRuntimeAlert,
} from '@coopers/common';

@Injectable()
export class AdminRealtimeNotificationService {
  private readonly logger = new Logger(AdminRealtimeNotificationService.name);

  constructor(private readonly configService: ConfigService) {}

  async notifyAppointmentChanged(): Promise<void> {
    await this.notifyAdminDataChanged('appointment');
  }

  private async notifyAdminDataChanged(reason: 'appointment'): Promise<void> {
    try {
      const adminApiUrl = this.configService.getOrThrow<string>('ADMIN_API_URL');
      const internalGatewaySecret =
        this.configService.getOrThrow<string>('INTERNAL_GATEWAY_SECRET');

      const response = await fetch(
        joinServiceUrl(adminApiUrl, ADMIN_REALTIME_DATA_CHANGED_PATH),
        {
          method: 'POST',
          headers: {
            accept: 'application/json',
            'content-type': 'application/json',
            [INTERNAL_GATEWAY_SECRET_HEADER]: internalGatewaySecret,
          },
          body: JSON.stringify({ reason }),
        },
      );

      if (!response.ok) {
        const detail = `Admin realtime notification failed with status ${response.status}.`;

        this.logger.warn(detail);
        sendRuntimeAlert({
          category: 'admin-realtime-notification-failure',
          detail,
          severity: 'warning',
          statusCode: response.status,
          statusText: response.statusText,
          throttleSeconds: 900,
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const detail = `Admin realtime notification failed: ${message}`;

      this.logger.warn(detail);
      sendRuntimeAlert({
        category: 'admin-realtime-notification-failure',
        detail,
        error,
        severity: 'warning',
        throttleSeconds: 900,
      });
    }
  }
}
