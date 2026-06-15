import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HairHistory, Staff, User } from '@coopers/entities';
import { AdminAuthModule } from '../auth/admin-auth.module';
import { HairHistoryController } from './hair-history.controller';
import { HairHistoryService } from './hair-history.service';

@Module({
  imports: [
    AdminAuthModule,
    TypeOrmModule.forFeature([HairHistory, Staff, User]),
  ],
  controllers: [HairHistoryController],
  providers: [HairHistoryService],
})
export class HairHistoryModule {}
