import { IsEmail, IsNotEmpty, MinLength } from 'class-validator';

// Data to be expected from the body of the create user request.

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @MinLength(6)
  password: string;
}
