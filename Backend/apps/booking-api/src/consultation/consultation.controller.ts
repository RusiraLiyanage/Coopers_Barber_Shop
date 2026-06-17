import { Body, Controller, Post, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { JwtAuthenticatedRequest } from '../auth/auth.types';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ConsultationService } from './consultation.service';
import { StartConsultationDto } from './dto/start-consultation.dto';
import { SubmitConsultationDto } from './dto/submit-consultation.dto';
import {
  ConsultationStartResponse,
  ConsultationSubmitResponse,
} from './consultation.types';

@ApiTags('consultation')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('consultation')
export class ConsultationController {
  constructor(private readonly consultationService: ConsultationService) {}

  @ApiOperation({ summary: 'Start a service-aware booking consultation' })
  @Post('start')
  startConsultation(
    @Request() req: JwtAuthenticatedRequest,
    @Body() dto: StartConsultationDto,
  ): Promise<ConsultationStartResponse> {
    return this.consultationService.startConsultation(
      req.user.userId,
      dto.serviceId,
    );
  }

  @ApiOperation({ summary: 'Submit consultation answers and match a barber' })
  @Post('submit')
  submitConsultation(
    @Request() req: JwtAuthenticatedRequest,
    @Body() dto: SubmitConsultationDto,
  ): Promise<ConsultationSubmitResponse> {
    return this.consultationService.submitConsultation(
      req.user.userId,
      dto.serviceId,
      dto.answers,
    );
  }
}
