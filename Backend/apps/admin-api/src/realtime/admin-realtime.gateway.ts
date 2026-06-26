import { Logger } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
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

  constructor(private readonly adminRealtimeService: AdminRealtimeService) {}

  afterInit(server: Server): void {
    this.adminRealtimeService.bindServer(server);
    this.logger.log(
      `Admin realtime gateway ready at ${ADMIN_REALTIME_NAMESPACE}`,
    );
  }

  handleConnection(client: Socket): void {
    this.logger.debug(`Admin realtime client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket): void {
    this.logger.debug(`Admin realtime client disconnected: ${client.id}`);
  }
}
