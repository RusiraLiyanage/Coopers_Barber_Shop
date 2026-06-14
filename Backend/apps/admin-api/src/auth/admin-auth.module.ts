import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AdminRoleGuard } from './guards/admin-role.guard';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [PassportModule],
  providers: [JwtStrategy, JwtAuthGuard, AdminRoleGuard],
  exports: [JwtAuthGuard, AdminRoleGuard],
})
export class AdminAuthModule {}
