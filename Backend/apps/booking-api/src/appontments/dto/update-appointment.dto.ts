import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsString } from 'class-validator';

export class UpdateAppointmentDto {
  @ApiProperty({ example: '2026-06-15', format: 'date' })
  @IsDateString()
  date!: string;

  @ApiProperty({ example: '09:45-10:15' })
  @IsString()
  slot!: string;
}
