import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsEmail, IsOptional, IsString } from 'class-validator';

// Data to be expected from the body of the login request.

export class LoginDto {
  // The email of the user trying to log in.
  @ApiProperty({ example: 'customer@example.com' })
  @IsEmail()
  @IsString()
  email!: string;

  // The password of the user trying to log in.
  @ApiProperty({ example: 'securePassword123', minLength: 6 })
  @IsString()
  password!: string;

  @ApiProperty({ example: false, required: false })
  @IsOptional()
  @IsBoolean()
  endExistingSessions?: boolean;
}
