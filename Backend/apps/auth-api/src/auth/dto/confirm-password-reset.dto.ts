import { ApiProperty } from '@nestjs/swagger';
import {
  IsAccountPassword,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
} from './account-password.decorator';
import { VerifyPasswordResetCodeDto } from './verify-password-reset-code.dto';

export class ConfirmPasswordResetDto extends VerifyPasswordResetCodeDto {
  @ApiProperty({
    example: 'newSecurePassword123',
    minLength: PASSWORD_MIN_LENGTH,
    maxLength: PASSWORD_MAX_LENGTH,
  })
  @IsAccountPassword()
  password!: string;
}
