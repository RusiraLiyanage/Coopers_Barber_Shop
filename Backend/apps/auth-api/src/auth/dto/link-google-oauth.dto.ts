import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class LinkGoogleOAuthDto {
  @ApiProperty({ description: 'Signed link ticket issued by the OAuth flow' })
  @IsString()
  @IsNotEmpty()
  linkTicket!: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  @IsNotEmpty()
  password!: string;
}
