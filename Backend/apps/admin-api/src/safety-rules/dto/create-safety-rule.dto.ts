import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { SafetyRuleSeverity } from '@coopers/entities';

export class CreateSafetyRuleDto {
  @ApiProperty({ example: 'Client reports scalp sensitivity' })
  @IsString()
  @MaxLength(160)
  condition: string;

  @ApiProperty({
    example: [
      '3f80f26d-3278-4bdf-9de2-a6f13adf64d3',
      '9d40f26d-3278-4bdf-9de2-a6f13adf64d3',
    ],
    type: [String],
  })
  @IsArray()
  @ArrayMaxSize(50)
  @IsUUID('4', { each: true })
  serviceIds: string[];

  @ApiProperty({
    example:
      'Ask the client about allergies and recommend a patch test before chemical services.',
  })
  @IsString()
  @MaxLength(1000)
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
