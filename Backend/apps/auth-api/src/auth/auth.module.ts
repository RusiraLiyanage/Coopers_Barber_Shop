import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  JwtTokenService,
  PasswordService,
  SessionService,
} from '@coopers/common';
import { AuthSession } from '@coopers/entities';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { LocalStrategy } from './strategies/local.strategy';

function getAccessTokenTtlSeconds(config: ConfigService): number {
  const configuredTtl = Number(
    config.get<string>('ACCESS_TOKEN_TTL_SECONDS') ?? '900',
  );

  return Number.isFinite(configuredTtl) && configuredTtl > 0
    ? configuredTtl
    : 900;
}

@Module({
  imports: [
    UsersModule,
    TypeOrmModule.forFeature([AuthSession]),
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
    PasswordService,
    JwtTokenService,
    SessionService,
  ],
  exports: [AuthService],
})
export class AuthModule {}
