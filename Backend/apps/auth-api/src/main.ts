import { ConfigService } from '@nestjs/config';
import {
  configureApiSecurity,
  configureSwagger,
  ensureNodeCryptoGlobal,
} from '@coopers/common';

ensureNodeCryptoGlobal(); // UUID needs crypto

async function bootstrap() {
  const [{ NestFactory }, { AppModule }] = await Promise.all([
    import('@nestjs/core'),
    import('./app.module.js'),
  ]);

  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  const rawAuthApiPort = config.get<number>('AUTH_API_PORT');
  const authApiPort: number =
    typeof rawAuthApiPort === 'number' ? rawAuthApiPort : 7312;

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

  await app.listen(authApiPort);
}

void bootstrap();
