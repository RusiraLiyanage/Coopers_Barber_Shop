import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { StaffRole } from '@coopers/entities';

export class CreateBarberDto {
  @ApiProperty({ example: 'Main Staff' })
  @IsString()
  @MaxLength(120)
  displayName: string;

  @ApiPropertyOptional({ example: 'barber@coopers.local' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ enum: StaffRole, example: StaffRole.SENIOR })
  @IsOptional()
  @IsEnum(StaffRole)
  role?: StaffRole;

  @ApiPropertyOptional({ example: 'Australia/Sydney' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  timezone?: string;

  @ApiPropertyOptional({
    description:
      'Services, treatments, and client situations this barber can confidently handle.',
    example: ['skin fades', 'beard shaping', 'sensitive scalp support'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  skills?: string[];

  @ApiPropertyOptional({ example: 4.8 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(5)
  rating?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  available?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
