import { Module } from '@nestjs/common';
import { AdminRealtimeGateway } from './admin-realtime.gateway';
import { AdminRealtimeService } from './admin-realtime.service';

@Module({
  providers: [AdminRealtimeGateway, AdminRealtimeService],
  exports: [AdminRealtimeService],
})
export class AdminRealtimeModule {}
