import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateHairHistoryDto {
  @ApiProperty({ example: '3f80f26d-3278-4bdf-9de2-a6f13adf64d3' })
  @IsUUID()
  clientId: string;

  @ApiPropertyOptional({ example: '9d40f26d-3278-4bdf-9de2-a6f13adf64d3' })
  @IsOptional()
  @IsUUID()
  barberId?: string;

  @ApiProperty({ example: 'Hair Coloring' })
  @IsString()
  @MaxLength(120)
  service: string;

  @ApiProperty({ example: ['dry ends', 'box dye history'], type: [String] })
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  hairState: string[];

  @ApiPropertyOptional({ example: 'Bond repair treatment, toner.' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  productsUsed?: string;

  @ApiPropertyOptional({
    example: 'Avoid high-volume bleach until hair condition improves.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  barberNotes?: string;

  @ApiProperty({ example: '2026-06-14' })
  @IsDateString()
  visitDate: string;
}
