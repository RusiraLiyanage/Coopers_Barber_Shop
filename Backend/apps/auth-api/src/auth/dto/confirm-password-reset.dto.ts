import { ApiProperty } from '@nestjs/swagger';
import { MinLength } from 'class-validator';
import { VerifyPasswordResetCodeDto } from './verify-password-reset-code.dto';

export class ConfirmPasswordResetDto extends VerifyPasswordResetCodeDto {
  @ApiProperty({ example: 'newSecurePassword123', minLength: 6 })
  @MinLength(6)
  password: string;
}
