import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';

const AU_MOBILE_PATTERN = /^(?:\+?61|0)4\d{8}$/;

// data to be expected from the body of the register request.

export class RegisterDto {
  @ApiProperty({ example: 'Cooper' })
  @IsString()
  @IsNotEmpty()
  firstName!: string;

  @ApiProperty({ example: 'Smith' })
  @IsString()
  @IsNotEmpty()
  lastName!: string;

  @ApiProperty({ example: '+61412345678' })
  @IsString()
  @IsNotEmpty()
  @Matches(AU_MOBILE_PATTERN, {
    message: 'Mobile must be a valid Australian mobile number',
  })
  mobile!: string;

  @ApiProperty({ example: 'Surry Hills' })
  @IsString()
  @IsNotEmpty()
  suburb!: string;

  // The email of the user trying to register.
  @ApiProperty({ example: 'customer@example.com' })
  @IsEmail()
  @IsNotEmpty()
  @IsString()
  email!: string;

  // The password of the user trying to register. (type string, min length 6)
  @ApiProperty({ example: 'securePassword123', minLength: 6 })
  @IsString()
  @MinLength(6)
  password!: string;
}
