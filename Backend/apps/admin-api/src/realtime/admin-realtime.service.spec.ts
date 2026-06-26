import type { Server } from 'socket.io';
import { ADMIN_DATA_CHANGED_EVENT } from '@coopers/common';
import { AdminRealtimeService } from './admin-realtime.service';

describe('AdminRealtimeService', () => {
  it('returns false when the realtime server is not ready', () => {
    const service = new AdminRealtimeService();

    expect(
      service.emitAdminDataChanged({
        version: '2026-06-26T00:00:00.000Z',
        reason: 'brief',
      }),
    ).toBe(false);
  });

  it('emits admin data changed events when the server is ready', () => {
    const service = new AdminRealtimeService();
    const server = {
      emit: jest.fn(),
    } as unknown as Server;
    const payload = {
      version: '2026-06-26T00:00:00.000Z',
      reason: 'brief' as const,
    };

    service.bindServer(server);

    expect(service.emitAdminDataChanged(payload)).toBe(true);
    expect(server.emit).toHaveBeenCalledWith(ADMIN_DATA_CHANGED_EVENT, payload);
  });
});
