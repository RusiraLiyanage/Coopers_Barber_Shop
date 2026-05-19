import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { createAppConfigOptions } from '@coopers/common';
import { DatabaseModule } from '@coopers/database';
import { HealthController } from './health.controller';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot(createAppConfigOptions()),
    DatabaseModule.forRoot(),
    AuthModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
