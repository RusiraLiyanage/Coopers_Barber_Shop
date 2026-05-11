import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';

// This module handles database connectivity using TypeORM and PostgreSQL.

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }), // load .env globally
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('DB_HOST', 'localhost'),
        port: parseInt(config.get<string>('DB_PORT', '5432')),
        username: config.get<string>('DB_USERNAME', 'booking_user'),
        password: config.get<string>('DB_PASSWORD', 'rusira123'),
        database: config.get<string>('DB_DATABASE', 'booking_db'),
        autoLoadEntities: true,
        synchronize: false,
        logging: ['error', 'warn'],
      }),
    }),
  ],
})
export class DatabaseModule {}
