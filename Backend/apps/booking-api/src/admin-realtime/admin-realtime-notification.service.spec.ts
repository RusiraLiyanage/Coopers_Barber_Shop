import { ConfigService } from '@nestjs/config';
import { AdminRealtimeNotificationService } from './admin-realtime-notification.service';

describe('AdminRealtimeNotificationService', () => {
  const configService = {
    getOrThrow: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    configService.getOrThrow.mockImplementation((key: string) => {
      if (key === 'ADMIN_API_URL') {
        return 'http://localhost:7313/';
      }

      if (key === 'INTERNAL_GATEWAY_SECRET') {
        return 'shared-secret';
      }

      throw new Error(`Unexpected config key: ${key}`);
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('posts appointment change notifications to the admin internal endpoint', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      status: 202,
    } as Response);
    const service = new AdminRealtimeNotificationService(
      configService as unknown as ConfigService,
    );

    await service.notifyAppointmentChanged();

    expect(fetchSpy).toHaveBeenCalledWith(
      'http://localhost:7313/admin/realtime/internal/data-changed',
      {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
          'x-internal-gateway-secret': 'shared-secret',
        },
        body: JSON.stringify({ reason: 'appointment' }),
      },
    );
  });

  it('does not throw when the admin notification request fails', async () => {
    jest.spyOn(global, 'fetch').mockRejectedValue(new Error('admin down'));
    const service = new AdminRealtimeNotificationService(
      configService as unknown as ConfigService,
    );

    await expect(service.notifyAppointmentChanged()).resolves.toBeUndefined();
  });
});
