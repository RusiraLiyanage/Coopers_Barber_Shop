import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, Matches } from 'class-validator';

const AU_MOBILE_PATTERN = /^(?:\+?61|0)4\d{8}$/;

export class UpdateAccountDto {
  @ApiProperty({ example: 'customer@example.com' })
  @IsEmail()
  @IsNotEmpty()
  @IsString()
  email: string;

  @ApiProperty({ example: 'Cooper' })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ example: 'Smith' })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({ example: '+61412345678' })
  @IsString()
  @IsNotEmpty()
  @Matches(AU_MOBILE_PATTERN, {
    message: 'Mobile must be a valid Australian mobile number',
  })
  mobile: string;

  @ApiProperty({ example: 'Surry Hills' })
  @IsString()
  @IsNotEmpty()
  suburb: string;
}
