import { ConfigService } from '@nestjs/config';
import {
  configureApiSecurity,
  configureSwagger,
  ensureNodeCryptoGlobal,
  getRequiredConfigInteger,
  loadAppEnvFile,
} from '@coopers/common';

loadAppEnvFile();
ensureNodeCryptoGlobal(); // uuid needs crypto

async function bootstrap() {
  const [{ NestFactory }, { AppModule }] = await Promise.all([
    import('@nestjs/core'),
    import('./app.module.js'),
  ]);
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  // No CORS: booking-api is reached only by the booking-guard (server-to-server),
  // never directly by the browser.
  configureApiSecurity(app);
  configureSwagger(app, {
    title: "Cooper's Barbershop Booking API",
    description:
      'Booking, staff, services, users, appointments, and consultation endpoints.',
    tags: [
      'health',
      'users',
      'services',
      'staff',
      'appointments',
      'consultation',
    ],
  });

  await app.listen(getRequiredConfigInteger(config, 'API_PORT'));
}
void bootstrap();
