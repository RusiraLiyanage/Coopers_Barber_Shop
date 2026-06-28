import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import {
  Appointment,
  AppointmentBrief,
  AuthSession,
  HairHistory,
  IdempotencyKey,
  InviteToken,
  OAuthIdentity,
  PasswordResetToken,
  ReferenceDataItem,
  SafetyRule,
  Service,
  Staff,
  User,
} from '@coopers/entities';

const DEFAULT_DB_PORT = '5432';
const DEFAULT_DB_SSL = 'false';
const DEFAULT_DB_SSL_REJECT_UNAUTHORIZED = 'false';
const SHARED_ENTITIES = [
  Appointment,
  AppointmentBrief,
  AuthSession,
  HairHistory,
  IdempotencyKey,
  InviteToken,
  OAuthIdentity,
  PasswordResetToken,
  ReferenceDataItem,
  SafetyRule,
  Service,
  Staff,
  User,
];

const getBooleanConfig = (
  config: ConfigService,
  key: string,
  fallback: string,
): boolean => config.get<string>(key, fallback).toLowerCase() === 'true';

export const createDatabaseConfig = (
  config: ConfigService,
): TypeOrmModuleOptions => {
  const sslEnabled = getBooleanConfig(config, 'DB_SSL', DEFAULT_DB_SSL);

  return {
    type: 'postgres',
    host: config.get<string>('DB_HOST', 'localhost'),
    port: Number.parseInt(config.get<string>('DB_PORT', DEFAULT_DB_PORT), 10),
    username: config.get<string>('DB_USERNAME', 'booking_user'),
    password: config.get<string>('DB_PASSWORD', 'rusira123'),
    database: config.get<string>('DB_DATABASE', 'booking_db'),
    ssl: sslEnabled
      ? {
          rejectUnauthorized: getBooleanConfig(
            config,
            'DB_SSL_REJECT_UNAUTHORIZED',
            DEFAULT_DB_SSL_REJECT_UNAUTHORIZED,
          ),
        }
      : undefined,
    entities: SHARED_ENTITIES,
    autoLoadEntities: true,
    synchronize: false,
    logging: ['error', 'warn'],
  };
};
