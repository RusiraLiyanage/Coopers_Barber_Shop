import { IsEmail, IsString } from 'class-validator';

// Data to be expected from the body of the login request.

export class LoginDto {
  // The email of the user trying to log in.
  @IsEmail()
  email: string;

  // The password of the user trying to log in.
  @IsString()
  password: string;
}
