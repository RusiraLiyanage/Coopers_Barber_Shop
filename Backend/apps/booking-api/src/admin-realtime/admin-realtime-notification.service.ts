import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const INTERNAL_GATEWAY_SECRET_HEADER = 'x-internal-gateway-secret';

@Injectable()
export class AdminRealtimeNotificationService {
  private readonly logger = new Logger(AdminRealtimeNotificationService.name);

  constructor(private readonly configService: ConfigService) {}

  async notifyAppointmentChanged(): Promise<void> {
    await this.notifyAdminDataChanged('appointment');
  }

  private async notifyAdminDataChanged(reason: 'appointment'): Promise<void> {
    try {
      const adminApiUrl = this.normalizeBaseUrl(
        this.configService.getOrThrow<string>('ADMIN_API_URL'),
      );
      const internalGatewaySecret =
        this.configService.getOrThrow<string>('INTERNAL_GATEWAY_SECRET');

      const response = await fetch(
        `${adminApiUrl}/admin/realtime/internal/data-changed`,
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
        this.logger.warn(
          `Admin realtime notification failed with status ${response.status}.`,
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      this.logger.warn(`Admin realtime notification failed: ${message}`);
    }
  }

  private normalizeBaseUrl(value: string): string {
    return value.replace(/\/+$/, '');
  }
}
