import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class StartConsultationDto {
  @ApiProperty({ example: '0f70d4ad-29ab-45a4-b0d5-914dd4559777' })
  @IsUUID()
  serviceId!: string;
}
