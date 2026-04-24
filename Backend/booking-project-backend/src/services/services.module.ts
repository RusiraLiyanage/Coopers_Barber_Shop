import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServicesService } from './services.service';
import { ServicesController } from './services.controller';
import { Service } from './entities/service.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Service])],
  controllers: [ServicesController], // API endpoints for services.
  providers: [ServicesService], // business logic for services handling.
  exports: [ServicesService], // export for use in other modules if needed.
})
export class ServicesModule {}
