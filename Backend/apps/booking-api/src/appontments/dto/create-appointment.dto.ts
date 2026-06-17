import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsDateString, IsString, IsOptional } from 'class-validator';

export class CreateAppointmentDto {
  // The ID of the service to book an appointment for.
  @ApiProperty({ example: '0f70d4ad-29ab-45a4-b0d5-914dd4559777' })
  @IsUUID()
  serviceId!: string;

  @ApiProperty({
    example: '11111111-1111-1111-1111-111111111111',
    required: false,
    description: 'The selected barber/staff member for the appointment.',
  })
  @IsOptional()
  @IsUUID()
  staffId?: string;

  // The date for the appointment. Format: "YYYY-MM-DD".
  @ApiProperty({ example: '2026-06-15', format: 'date' })
  @IsDateString()
  date!: string; // e.g., "2025-09-22"

  // The time slot for the appointment. Format: "HH:mm-HH:mm". (start time-end time)
  @ApiProperty({ example: '09:45-10:15' })
  @IsString()
  slot!: string; // e.g., "09:45-10:15"
}
