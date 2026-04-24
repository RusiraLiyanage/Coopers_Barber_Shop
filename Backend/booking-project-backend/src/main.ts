import * as nodeCrypto from 'node:crypto';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';

// Some Nest/TypeORM builds assume `crypto` exists globally.
// Define it explicitly for Node runtimes where that global is missing.
if (typeof globalThis.crypto === 'undefined') {
  Object.defineProperty(globalThis, 'crypto', {
    value: nodeCrypto,
    configurable: true,
  });
}

async function bootstrap() {
  const [{ NestFactory }, { AppModule }, { AllExceptionsFilter }] =
    await Promise.all([
      import('@nestjs/core'),
      import('./app.module.js'),
      import('./common/filters/all-exceptions.filter.js'),
    ]);
  const app = await NestFactory.create(AppModule);

  app.enableCors();
  app.use(helmet()); // helmet to prevent basic web exploits.

  // Apply global filter
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // strip unknown fields
      forbidNonWhitelisted: true, // throw if extra fields provided
      transform: true, // auto-transform DTOs
    }),
  );
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
