import { AdminRealtimeController } from './admin-realtime.controller';
import { AdminRealtimeNotifierService } from './admin-realtime-notifier.service';

describe('AdminRealtimeController', () => {
  const notifierService = {
    notifyDataChanged: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('accepts internal admin data change notifications', async () => {
    const controller = new AdminRealtimeController(
      notifierService as unknown as AdminRealtimeNotifierService,
    );

    await expect(
      controller.notifyDataChanged({ reason: 'appointment' }),
    ).resolves.toEqual({ accepted: true });

    expect(notifierService.notifyDataChanged).toHaveBeenCalledWith(
      'appointment',
    );
  });
});
