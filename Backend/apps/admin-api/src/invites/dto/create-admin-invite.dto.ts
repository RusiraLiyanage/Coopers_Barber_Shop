import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEmail, IsInt, IsOptional, Max, Min } from 'class-validator';

export class CreateAdminInviteDto {
  @ApiProperty({ example: 'admin@coopers.local' })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({ example: 7 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(30)
  expiresInDays?: number;
}
