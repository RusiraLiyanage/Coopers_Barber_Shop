import type { Server, Socket } from 'socket.io';
import { AdminRealtimeAuthService } from './admin-realtime-auth.service';
import { AdminRealtimeGateway } from './admin-realtime.gateway';
import { AdminRealtimeService } from './admin-realtime.service';

describe('AdminRealtimeGateway', () => {
  const authService = {
    authenticateHandshake: jest.fn(),
  };
  const realtimeService = {
    bindServer: jest.fn(),
  };

  let gateway: AdminRealtimeGateway;

  beforeEach(() => {
    jest.clearAllMocks();
    gateway = new AdminRealtimeGateway(
      authService as unknown as AdminRealtimeAuthService,
      realtimeService as unknown as AdminRealtimeService,
    );
  });

  it('binds the socket server after gateway initialization', () => {
    const server = {
      emit: jest.fn(),
    } as unknown as Server;

    gateway.afterInit(server);

    expect(realtimeService.bindServer).toHaveBeenCalledWith(server);
  });

  it('stores the authenticated admin user on the socket connection', async () => {
    const user = {
      userId: 'admin-1',
      email: 'admin@example.com',
      role: 'ADMIN',
      sessionId: 'session-1',
    };
    const client = createSocketClient();

    authService.authenticateHandshake.mockResolvedValue(user);

    await gateway.handleConnection(client);

    expect(authService.authenticateHandshake).toHaveBeenCalledWith(
      client.handshake,
    );
    expect(client.data.user).toEqual(user);
    expect(client.emit).not.toHaveBeenCalled();
    expect(client.disconnect).not.toHaveBeenCalled();
  });

  it('emits a connection error and disconnects rejected sockets', async () => {
    const client = createSocketClient();

    authService.authenticateHandshake.mockRejectedValue(
      new Error('Admin socket authentication failed.'),
    );

    await gateway.handleConnection(client);

    expect(client.emit).toHaveBeenCalledWith('connect_error', {
      message: 'Admin socket authentication failed.',
    });
    expect(client.disconnect).toHaveBeenCalledWith(true);
  });
});

function createSocketClient(): Socket {
  return {
    id: 'socket-1',
    handshake: {
      headers: {
        cookie: 'admin_tsa=token',
      },
    },
    data: {},
    emit: jest.fn(),
    disconnect: jest.fn(),
  } as unknown as Socket;
}
