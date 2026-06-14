import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
} from 'class-validator';
import { SafetyRuleSeverity } from '@coopers/entities';

export class CreateSafetyRuleDto {
  @ApiProperty({ example: 'Client reports scalp sensitivity' })
  @IsString()
  condition: string;

  @ApiProperty({
    example: ['Hair Coloring', 'Deep Conditioning Treatment'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  services: string[];

  @ApiProperty({
    example:
      'Ask the client about allergies and recommend a patch test before chemical services.',
  })
  @IsString()
  message: string;

  @ApiPropertyOptional({
    enum: SafetyRuleSeverity,
    example: SafetyRuleSeverity.HIGH,
  })
  @IsOptional()
  @IsEnum(SafetyRuleSeverity)
  severity?: SafetyRuleSeverity;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
