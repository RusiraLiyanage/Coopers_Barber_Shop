import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class SessionValidationDto {
  @ApiProperty({ example: 'auth-session-id' })
  @IsString()
  @IsNotEmpty()
  sessionId: string;
}
