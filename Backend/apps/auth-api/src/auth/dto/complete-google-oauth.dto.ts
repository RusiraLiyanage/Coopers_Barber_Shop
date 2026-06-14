import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class CompleteGoogleOAuthDto {
  @ApiProperty({ example: '10769150350006150715113082367' })
  @IsString()
  @IsNotEmpty()
  providerUserId!: string;

  @ApiProperty({ example: 'customer@example.com' })
  @IsEmail()
  @IsNotEmpty()
  @IsString()
  email!: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  emailVerified!: boolean;

  @ApiPropertyOptional({ example: 'Cooper' })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional({ example: 'Smith' })
  @IsOptional()
  @IsString()
  lastName?: string;
}
