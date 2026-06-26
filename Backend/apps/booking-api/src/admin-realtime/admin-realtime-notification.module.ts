import { Module } from '@nestjs/common';
import { AdminRealtimeNotificationService } from './admin-realtime-notification.service';

@Module({
  providers: [AdminRealtimeNotificationService],
  exports: [AdminRealtimeNotificationService],
})
export class AdminRealtimeNotificationModule {}
