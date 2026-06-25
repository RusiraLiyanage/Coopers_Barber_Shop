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

  // No browser CORS here: admin-api is an internal service that should be
  // reached through the guard/proxy layer.
  configureApiSecurity(app);
  configureSwagger(app, {
    title: "Cooper's Barbershop Admin API",
    description:
      'Admin operations for barber profiles, service AI configuration, safety rules, and appointment briefs.',
    tags: ['health', 'barbers', 'safety-rules', 'admin-services', 'briefs'],
  });

  await app.listen(getRequiredConfigInteger(config, 'ADMIN_API_PORT'));
}

void bootstrap();
