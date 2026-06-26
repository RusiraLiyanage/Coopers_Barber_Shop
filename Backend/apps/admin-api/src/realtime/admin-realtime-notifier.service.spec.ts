import { DataVersionService } from '../data-version/data-version.service';
import { AdminRealtimeNotifierService } from './admin-realtime-notifier.service';
import { AdminRealtimeService } from './admin-realtime.service';

describe('AdminRealtimeNotifierService', () => {
  const dataVersionService = {
    getVersion: jest.fn(),
  };
  const adminRealtimeService = {
    emitAdminDataChanged: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('emits admin data changed with the latest version', async () => {
    const service = new AdminRealtimeNotifierService(
      dataVersionService as unknown as DataVersionService,
      adminRealtimeService as unknown as AdminRealtimeService,
    );

    dataVersionService.getVersion.mockResolvedValue({
      version: '2026-06-26T00:00:00.000Z',
    });

    await service.notifyDataChanged('brief');

    expect(adminRealtimeService.emitAdminDataChanged).toHaveBeenCalledWith({
      version: '2026-06-26T00:00:00.000Z',
      reason: 'brief',
    });
  });

  it('does not throw when version lookup fails', async () => {
    const service = new AdminRealtimeNotifierService(
      dataVersionService as unknown as DataVersionService,
      adminRealtimeService as unknown as AdminRealtimeService,
    );

    dataVersionService.getVersion.mockRejectedValue(new Error('db down'));

    await expect(service.notifyDataChanged('brief')).resolves.toBeUndefined();
    expect(adminRealtimeService.emitAdminDataChanged).not.toHaveBeenCalled();
  });
});
