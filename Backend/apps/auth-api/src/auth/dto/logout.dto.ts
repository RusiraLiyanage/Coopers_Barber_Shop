import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

// Data to be expected from the body of the logout request.

export class LogoutDto {
  // The refresh token session to revoke.
  @ApiProperty({ example: 'refresh-token-value' })
  @IsString()
  @IsNotEmpty()
  refresh_token: string;
}
