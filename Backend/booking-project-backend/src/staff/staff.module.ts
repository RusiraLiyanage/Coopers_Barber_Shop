import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Staff } from './entities/staff.entity';
import { StaffService } from './staff.service';
import { StaffController } from './staff.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Staff])],
  providers: [StaffService], // business logic for staff handling.
  controllers: [StaffController], // API endpoints for staff.
  exports: [TypeOrmModule, StaffService], // export for use in other modules if needed.
})
export class StaffModule {}
