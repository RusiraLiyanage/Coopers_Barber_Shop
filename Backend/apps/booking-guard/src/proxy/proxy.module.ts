import { Module } from '@nestjs/common';
import { GuardConfigModule } from '@coopers/common';
import { PublicProxyController } from './public-proxy.controller';
import { ProxyService } from './proxy.service';

@Module({
  imports: [GuardConfigModule],
  controllers: [PublicProxyController],
  providers: [ProxyService],
})
export class ProxyModule {}
