import { ConfigService } from '@nestjs/config';
import {
  configureApiSecurity,
  configureSwagger,
  ensureNodeCryptoGlobal,
  getRequiredConfigInteger,
  loadAppEnvFile,
} from '@coopers/common';

loadAppEnvFile();
ensureNodeCryptoGlobal(); // UUID needs crypto

async function bootstrap() {
  const [{ NestFactory }, { AppModule }] = await Promise.all([
    import('@nestjs/core'),
    import('./app.module.js'),
  ]);

  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  // No CORS: auth-api is reached only by the booking-guard (server-to-server),
  // never directly by the browser.
  configureApiSecurity(app);
  configureSwagger(app, {
    title: "Cooper's Barbershop Auth API",
    description:
      'Authentication, token refresh, logout, and session endpoints.',
    tags: ['health', 'auth'],
    bearerAuth: false,
  });

  await app.listen(getRequiredConfigInteger(config, 'AUTH_API_PORT'));
}

void bootstrap();
