import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class AcceptAdminInviteDto {
  @ApiProperty({ example: '3f80f26d-3278-4bdf-9de2-a6f13adf64d3' })
  @IsUUID()
  token: string;

  @ApiProperty({ example: 'SecurePassword123!' })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password: string;

  @ApiPropertyOptional({ example: 'Cooper' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  firstName?: string;

  @ApiPropertyOptional({ example: 'Admin' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  lastName?: string;

  @ApiPropertyOptional({ example: '+61412345678' })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  mobile?: string;

  @ApiPropertyOptional({ example: 'Surry Hills' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  suburb?: string;
}
