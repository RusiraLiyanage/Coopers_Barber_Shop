import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { ServiceComplexity } from '@coopers/entities';

export class UpdateServiceDto {
  @ApiPropertyOptional({ example: 'Texture Styling' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @ApiPropertyOptional({ example: 45 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  durationMinutes?: number;

  @ApiPropertyOptional({
    example: ['hair styling', 'curly hair'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  requiredSkills?: string[];

  @ApiPropertyOptional({
    example: ['scalp sensitivity', 'formal event request'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  safetyTriggers?: string[];

  @ApiPropertyOptional({
    enum: ServiceComplexity,
    example: ServiceComplexity.MEDIUM,
  })
  @IsOptional()
  @IsEnum(ServiceComplexity)
  complexity?: ServiceComplexity;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
