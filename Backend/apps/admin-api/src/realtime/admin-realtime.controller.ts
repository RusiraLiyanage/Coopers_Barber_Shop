import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminRealtimeNotifierService } from './admin-realtime-notifier.service';
import { NotifyAdminDataChangedDto } from './dto/notify-admin-data-changed.dto';

@ApiTags('admin-realtime')
@Controller('admin/realtime')
export class AdminRealtimeController {
  constructor(
    private readonly adminRealtimeNotifierService: AdminRealtimeNotifierService,
  ) {}

  @ApiOperation({
    summary: 'Notify admin clients that admin-visible data changed',
  })
  @ApiBody({ type: NotifyAdminDataChangedDto })
  @HttpCode(HttpStatus.ACCEPTED)
  @Post('internal/data-changed')
  async notifyDataChanged(
    @Body() dto: NotifyAdminDataChangedDto,
  ): Promise<{ accepted: true }> {
    await this.adminRealtimeNotifierService.notifyDataChanged(dto.reason);

    return { accepted: true };
  }
}
