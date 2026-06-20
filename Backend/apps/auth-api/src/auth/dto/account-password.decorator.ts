import { applyDecorators } from '@nestjs/common';
import { IsString, MaxLength, MinLength } from 'class-validator';

// Single source of truth for the account-password policy so registration and
// password-reset can never drift apart (e.g. register requiring 8 while reset
// still allows 6).
//
// Length-based per NIST 800-63B: an 8-character floor and no forced composition
// rules (those push users toward predictable patterns; length + breach screening
// is the stronger control). The 72-character ceiling matches bcrypt's input
// limit — bcrypt silently truncates anything past 72 bytes, so we reject it up
// front instead of hashing a value that differs from what the user typed.
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 72;

export function IsAccountPassword(): PropertyDecorator {
  return applyDecorators(
    IsString(),
    MinLength(PASSWORD_MIN_LENGTH, {
      message: `Password must be at least ${PASSWORD_MIN_LENGTH} characters long`,
    }),
    MaxLength(PASSWORD_MAX_LENGTH, {
      message: `Password must be at most ${PASSWORD_MAX_LENGTH} characters long`,
    }),
  );
}
