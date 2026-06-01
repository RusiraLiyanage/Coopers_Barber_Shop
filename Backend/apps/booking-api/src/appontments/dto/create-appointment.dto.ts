import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsDateString, IsString } from 'class-validator';

export class CreateAppointmentDto {
  // The ID of the service to book an appointment for.
  @ApiProperty({ example: '0f70d4ad-29ab-45a4-b0d5-914dd4559777' })
  @IsUUID()
  serviceId!: string;

  // The date for the appointment. Format: "YYYY-MM-DD".
  @ApiProperty({ example: '2026-06-15', format: 'date' })
  @IsDateString()
  date!: string; // e.g., "2025-09-22"

  // The time slot for the appointment. Format: "HH:mm-HH:mm". (start time-end time)
  @ApiProperty({ example: '09:45-10:15' })
  @IsString()
  slot!: string; // e.g., "09:45-10:15"
}
