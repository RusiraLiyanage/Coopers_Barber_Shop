import { Module } from '@nestjs/common';
import { GuardAuthenticationModule, GuardConfigModule } from '@coopers/common';
import { ProtectedProxyController } from './protected-proxy.controller';
import { ProtectedProxyService } from './protected-proxy.service';
import { PublicProxyController } from './public-proxy.controller';
import { ProxyService } from './proxy.service';

@Module({
  imports: [GuardConfigModule, GuardAuthenticationModule],
  controllers: [PublicProxyController, ProtectedProxyController],
  providers: [ProxyService, ProtectedProxyService],
})
export class ProxyModule {}
