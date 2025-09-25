import { IsEmail, IsString, MinLength } from 'class-validator';

// data to be expected from the body of the register request.

export class RegisterDto {
  // The email of the user trying to register.
  @IsEmail()
  email: string;

  // The password of the user trying to register. (tyoe string, min length 6)
  @IsString()
  @MinLength(6)
  password: string;
}
