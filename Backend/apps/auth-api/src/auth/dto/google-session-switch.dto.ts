import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class GoogleSessionSwitchDto {
  @ApiProperty({ description: 'Signed Google OAuth session switch ticket' })
  @IsString()
  @IsNotEmpty()
  linkTicket!: string;
}
