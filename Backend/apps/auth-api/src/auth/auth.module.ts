import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  EmailModule,
  getRequiredConfigInteger,
  JWT_AUDIENCE,
  JWT_ISSUER,
  JwtTokenService,
  PasswordService,
  SessionService,
} from '@coopers/common';
import {
  AuthSession,
  OAuthIdentity,
  PasswordResetToken,
} from '@coopers/entities';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthSessionCleanupService } from './auth-session-cleanup.service';
import { OAuthLinkTicketService } from './oauth-link-ticket.service';
import { LocalStrategy } from './strategies/local.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';

function getAccessTokenTtlSeconds(config: ConfigService): number {
  return getRequiredConfigInteger(config, 'ACCESS_TOKEN_TTL_SECONDS');
}

@Module({
  imports: [
    UsersModule, // imports will make thing easier to import within the Auth Service.
    EmailModule,
    TypeOrmModule.forFeature([AuthSession, PasswordResetToken, OAuthIdentity]),
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: getAccessTokenTtlSeconds(config),
          issuer: JWT_ISSUER,
          audience: JWT_AUDIENCE,
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
    OAuthLinkTicketService,
  ],
  exports: [AuthService],
})
export class AuthModule {}
