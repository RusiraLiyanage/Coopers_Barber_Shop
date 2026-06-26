import { Logger } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import { AdminRealtimeAuthService } from './admin-realtime-auth.service';
import { AdminRealtimeService } from './admin-realtime.service';
import { ADMIN_REALTIME_NAMESPACE } from './admin-realtime.types';

@WebSocketGateway({
  namespace: ADMIN_REALTIME_NAMESPACE,
  transports: ['websocket'],
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
