import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, MinLength } from 'class-validator';

// Data to be expected from the body of the create user request.

export class CreateUserDto {
  @ApiProperty({ example: 'customer@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'securePassword123', minLength: 6 })
  @IsNotEmpty()
  @MinLength(6)
  password!: string;
}
