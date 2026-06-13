import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  EmailModule,
  JwtTokenService,
  PasswordService,
  SessionService,
} from '@coopers/common';
import { AuthSession, PasswordResetToken } from '@coopers/entities';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthSessionCleanupService } from './auth-session-cleanup.service';
import { LocalStrategy } from './strategies/local.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';

function getAccessTokenTtlSeconds(config: ConfigService): number {
  const configuredTtl = Number(
    config.get<string>('ACCESS_TOKEN_TTL_SECONDS') ?? '300',
  );

  return Number.isFinite(configuredTtl) && configuredTtl > 0
    ? configuredTtl
    : 300;
}

@Module({
  imports: [
    UsersModule, // imports will make thing easier to import within the Auth Service.
    EmailModule,
    TypeOrmModule.forFeature([AuthSession, PasswordResetToken]),
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: getAccessTokenTtlSeconds(config),
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    LocalStrategy,
    JwtStrategy,
    PasswordService,
    JwtTokenService,
    SessionService,
    AuthSessionCleanupService,
  ],
  exports: [AuthService],
})
export class AuthModule {}
