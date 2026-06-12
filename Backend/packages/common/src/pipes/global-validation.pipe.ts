import { ValidationPipe } from '@nestjs/common';

// This handles DTO and params validation
export function createGlobalValidationPipe(): ValidationPipe {
  return new ValidationPipe({
    whitelist: true, // rejct the unknown ones from DTO
    forbidNonWhitelisted: true, // not decorated with Type ORM --> then will definitely block
    transform: true, // transform query params to clear values
  });
}
