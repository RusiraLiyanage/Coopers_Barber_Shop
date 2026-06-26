import { Injectable, Logger } from '@nestjs/common';
import { AdminDataChangedReason } from '@coopers/common';
import { DataVersionService } from '../data-version/data-version.service';
import { AdminRealtimeService } from './admin-realtime.service';

@Injectable()
export class AdminRealtimeNotifierService {
  private readonly logger = new Logger(AdminRealtimeNotifierService.name);

  constructor(
    private readonly dataVersionService: DataVersionService,
    private readonly adminRealtimeService: AdminRealtimeService,
  ) {}

  async notifyDataChanged(reason: AdminDataChangedReason): Promise<void> {
    try {
      const { version } = await this.dataVersionService.getVersion();

      this.adminRealtimeService.emitAdminDataChanged({
        version,
        reason,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      this.logger.warn(`Failed to emit admin data change event: ${message}`);
    }
  }
}
