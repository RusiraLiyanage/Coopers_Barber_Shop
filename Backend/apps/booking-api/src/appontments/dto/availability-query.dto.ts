import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsDateString, IsOptional } from 'class-validator';

export class AvailabilityQueryDto {
  // The ID of the service to check availability for.
  @ApiProperty({ example: '0f70d4ad-29ab-45a4-b0d5-914dd4559777' })
  @IsUUID()
  serviceId!: string;

  // The date to check availability on. Format: "YYYY-MM-DD".
  @ApiProperty({ example: '2026-06-15', format: 'date' })
  @IsDateString()
  date!: string; // "YYYY-MM-DD"

  @ApiProperty({
    example: '11111111-1111-1111-1111-111111111111',
    required: false,
    description: 'The selected barber/staff member to check availability for.',
  })
  @IsOptional()
  @IsUUID()
  staffId?: string;

  @ApiProperty({
    example: '9cc07820-5f57-4f0d-a3bc-0d8217f1fb42',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  excludeAppointmentId?: string;
}
