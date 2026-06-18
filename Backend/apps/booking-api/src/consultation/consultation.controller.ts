import {
  Body,
  Controller,
  Post,
  Request,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import type { JwtAuthenticatedRequest } from '../auth/auth.types';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ConsultationAiService } from './consultation-ai.service';
import { StartConsultationDto } from './dto/start-consultation.dto';
import { SubmitConsultationDto } from './dto/submit-consultation.dto';
import {
  ConsultationStartResponse,
  ConsultationStreamEvent,
  ConsultationSubmitResponse,
} from './consultation.types';

function writeSseEvent(
  response: Response,
  event: ConsultationStreamEvent,
): void {
  response.write(`event: ${event.type}\n`);
  response.write(`data: ${JSON.stringify(event)}\n\n`);
}

@ApiTags('consultation')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('consultation')
export class ConsultationController {
  constructor(private readonly consultationAiService: ConsultationAiService) {}

  @ApiOperation({ summary: 'Start a service-aware booking consultation' })
  @Post('start')
  startConsultation(
    @Request() req: JwtAuthenticatedRequest,
    @Body() dto: StartConsultationDto,
  ): Promise<ConsultationStartResponse> {
    return this.consultationAiService.startConsultation(
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
    return this.consultationAiService.submitConsultation(
      req.user.userId,
      dto.serviceId,
      dto.answers,
      dto.hairPhoto,
    );
  }

  @ApiOperation({
    summary: 'Stream consultation answer submission and barber match',
  })
  @Post('submit/stream')
  async submitConsultationStream(
    @Request() req: JwtAuthenticatedRequest,
    @Body() dto: SubmitConsultationDto,
    @Res() response: Response,
  ): Promise<void> {
    response.setHeader('Content-Type', 'text/event-stream');
    response.setHeader('Cache-Control', 'no-cache, no-transform');
    response.setHeader('Connection', 'keep-alive');
    response.flushHeaders();

    try {
      await this.consultationAiService.submitConsultationStream(
        req.user.userId,
        dto.serviceId,
        dto.answers,
        dto.hairPhoto,
        (event) => writeSseEvent(response, event),
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Unable to stream consultation.';
      writeSseEvent(response, {
        type: 'error',
        message,
      });
      writeSseEvent(response, { type: 'done' });
    } finally {
      response.end();
    }
  }
}
