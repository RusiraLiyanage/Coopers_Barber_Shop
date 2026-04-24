import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LocalStrategy } from './stretegies/local.stretegy';
import { JwtStrategy } from './stretegies/jwt.stretegy';

// Thus is the configuration hub for authentication. - JWT/Passport based user authentication.

@Module({
  imports: [
    UsersModule, // import UsersModule to use UsersService in AuthService.
    PassportModule, // PassportModule is used to handle authentication.
    JwtModule.registerAsync({
      // JwtModule is used to handle JWT tokens.
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '1h' },
      }),
    }),
  ],
  providers: [AuthService, LocalStrategy, JwtStrategy], // the logic for authentication is written here.
  controllers: [AuthController], // the API endpoints are defined here.
  exports: [AuthService], // export AuthService for use in other modules (e.g., AppModule).
})
export class AuthModule {}
