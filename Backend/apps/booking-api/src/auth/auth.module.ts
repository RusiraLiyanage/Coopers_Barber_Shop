import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './stretegies/jwt.stretegy';

// Booking API only validates JWTs forwarded by the guard.

@Module({
  imports: [PassportModule],
  providers: [JwtStrategy],
})
export class AuthModule {}
