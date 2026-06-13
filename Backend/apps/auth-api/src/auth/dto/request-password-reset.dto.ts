import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class RequestPasswordResetDto {
  @ApiProperty({ example: 'customer@example.com' })
  @IsEmail()
  @IsNotEmpty()
  @IsString()
  email!: string;
}
