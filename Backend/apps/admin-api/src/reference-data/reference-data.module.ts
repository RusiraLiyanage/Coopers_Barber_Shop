import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReferenceDataItem } from '@coopers/entities';
import { AdminAuthModule } from '../auth/admin-auth.module';
import { ReferenceDataController } from './reference-data.controller';
import { ReferenceDataService } from './reference-data.service';

@Module({
  imports: [AdminAuthModule, TypeOrmModule.forFeature([ReferenceDataItem])],
  controllers: [ReferenceDataController],
  providers: [ReferenceDataService],
})
export class ReferenceDataModule {}
