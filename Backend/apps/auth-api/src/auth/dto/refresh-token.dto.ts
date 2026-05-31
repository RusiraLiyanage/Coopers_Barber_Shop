import { IsNotEmpty, IsString } from 'class-validator';

// Data to be expected from the body of the refresh token request.

export class RefreshTokenDto {
  // The refresh token issued by the auth API during login or registration.
  @IsString()
  @IsNotEmpty()
  refresh_token: string;
}
