import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class UpdateAppointmentDto {
  @ApiProperty({ example: '09:45-10:15' })
  @IsString()
  slot!: string;
}
