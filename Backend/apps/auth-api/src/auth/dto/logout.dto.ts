import { IsNotEmpty, IsString } from 'class-validator';

// Data to be expected from the body of the logout request.

export class LogoutDto {
  // The refresh token session to revoke.
  @IsString()
  @IsNotEmpty()
  refresh_token: string;
}
