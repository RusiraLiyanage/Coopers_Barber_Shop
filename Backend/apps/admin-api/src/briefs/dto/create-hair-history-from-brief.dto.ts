import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateHairHistoryFromBriefDto {
  @ApiPropertyOptional({
    example: 'Bond repair treatment, toner.',
    description: 'Products or treatments actually used during the visit.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  productsUsed?: string;

  @ApiPropertyOptional({
    example:
      'Client tolerated toner well. Avoid high-volume bleach next visit.',
    description: 'Barber notes to carry into future consultations.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  barberNotes?: string;

  @ApiPropertyOptional({
    example: '2026-06-21',
    description: 'Visit date. Defaults to the appointment start date.',
  })
  @IsOptional()
  @IsDateString()
  visitDate?: string;
}
