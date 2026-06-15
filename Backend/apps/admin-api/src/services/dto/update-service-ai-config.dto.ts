import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
} from 'class-validator';
import { ServiceComplexity } from '@coopers/entities';

export class UpdateServiceAiConfigDto {
  @ApiPropertyOptional({
    example: ['colour', 'bleach'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  requiredSkills?: string[];

  @ApiPropertyOptional({
    example: ['allergy', 'scalp sensitivity', 'chemical history'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  safetyTriggers?: string[];

  @ApiPropertyOptional({
    enum: ServiceComplexity,
    example: ServiceComplexity.HIGH,
  })
  @IsOptional()
  @IsEnum(ServiceComplexity)
  complexity?: ServiceComplexity;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
