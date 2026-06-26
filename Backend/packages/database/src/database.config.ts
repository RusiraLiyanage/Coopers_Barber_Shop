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

export const createDatabaseConfig = (
  config: ConfigService,
): TypeOrmModuleOptions => ({
  type: 'postgres',
  host: config.get<string>('DB_HOST', 'localhost'),
  port: Number.parseInt(config.get<string>('DB_PORT', DEFAULT_DB_PORT), 10),
  username: config.get<string>('DB_USERNAME', 'booking_user'),
  password: config.get<string>('DB_PASSWORD', 'rusira123'),
  database: config.get<string>('DB_DATABASE', 'booking_db'),
  entities: SHARED_ENTITIES,
  autoLoadEntities: true,
  synchronize: false,
  logging: ['error', 'warn'],
});
