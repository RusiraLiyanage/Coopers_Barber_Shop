import { Logger } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import { ADMIN_REALTIME_NAMESPACE } from '@coopers/common';
import { AdminRealtimeAuthService } from './admin-realtime-auth.service';
import { AdminRealtimeService } from './admin-realtime.service';

function getAllowedAdminRealtimeOrigins(): string[] {
  const guardPortOrigin = process.env.GUARD_PORT
    ? `http://localhost:${process.env.GUARD_PORT}`
    : undefined;

  return [
    process.env.ADMIN_FRONTEND_DEV_URL,
    process.env.ADMIN_FRONTEND_URL,
    process.env.GUARD_URL,
    guardPortOrigin,
  ]
    .flatMap((value) => value?.split(',') ?? [])
    .map((origin) => origin.trim())
    .filter(Boolean);
}

@WebSocketGateway({
  namespace: ADMIN_REALTIME_NAMESPACE,
  transports: ['websocket'],
  cors: {
    origin: getAllowedAdminRealtimeOrigins(),
    credentials: true,
  },
})
export class AdminRealtimeGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(AdminRealtimeGateway.name);

  @WebSocketServer()
  private server!: Server;

  constructor(
    private readonly adminRealtimeAuthService: AdminRealtimeAuthService,
    private readonly adminRealtimeService: AdminRealtimeService,
  ) {}

  afterInit(server: Server): void {
    this.adminRealtimeService.bindServer(server);
    this.logger.log(
      `Admin realtime gateway ready at ${ADMIN_REALTIME_NAMESPACE}`,
    );
  }

  async handleConnection(client: Socket): Promise<void> {
    try {
      const user = await this.adminRealtimeAuthService.authenticateHandshake(
        client.handshake,
      );

      client.data.user = user;
      this.logger.debug(
        `Admin realtime client connected: ${client.id} (${user.email})`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unauthorized';

      this.logger.warn(
        `Rejected admin realtime client ${client.id}: ${message}`,
      );
      client.emit('connect_error', { message });
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket): void {
    this.logger.debug(`Admin realtime client disconnected: ${client.id}`);
  }
}
