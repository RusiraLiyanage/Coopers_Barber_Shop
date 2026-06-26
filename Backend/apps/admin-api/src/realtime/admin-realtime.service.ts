import { Injectable, Logger } from '@nestjs/common';
import type { Server } from 'socket.io';
import {
  ADMIN_DATA_CHANGED_EVENT,
  AdminDataChangedPayload,
} from '@coopers/common';

@Injectable()
export class AdminRealtimeService {
  private readonly logger = new Logger(AdminRealtimeService.name);
  private server: Server | null = null;

  bindServer(server: Server): void {
    this.server = server;
  }

  emitAdminDataChanged(payload: AdminDataChangedPayload): boolean {
    if (!this.server) {
      this.logger.warn(
        `Skipped ${ADMIN_DATA_CHANGED_EVENT}; realtime server is not ready.`,
      );
      return false;
    }

    this.server.emit(ADMIN_DATA_CHANGED_EVENT, payload);
    return true;
  }
}
