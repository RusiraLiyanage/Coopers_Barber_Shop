import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateBriefDto {
  @ApiProperty({ example: '3f80f26d-3278-4bdf-9de2-a6f13adf64d3' })
  @IsUUID()
  bookingId: string;

  @ApiPropertyOptional({ example: '9d40f26d-3278-4bdf-9de2-a6f13adf64d3' })
  @IsOptional()
  @IsUUID()
  barberId?: string;

  @ApiProperty({
    example: 'Client wants a low-maintenance trim with no chemical service.',
  })
  @IsString()
  @MaxLength(2000)
  clientSummary: string;

  @ApiPropertyOptional({
    example: 'Client mentioned previous scalp sensitivity.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  safetyNotes?: string;

  @ApiProperty({
    example: ['dry ends', 'recent colour'],
    type: [String],
  })
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  hairState: string[];

  @ApiPropertyOptional({ example: 'Soft layered finish.' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  desiredLook?: string;
}
