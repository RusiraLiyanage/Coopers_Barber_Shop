import { ValidationPipe } from '@nestjs/common';

// This handles DTO and params validation
export function createGlobalValidationPipe(): ValidationPipe {
  return new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  });
}
