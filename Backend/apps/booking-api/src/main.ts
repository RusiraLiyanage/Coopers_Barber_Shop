import { ConfigService } from '@nestjs/config';
import {
  configureApiSecurity,
  configureSwagger,
  ensureNodeCryptoGlobal,
} from '@coopers/common';

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
    description: 'Booking, staff, services, users, and appointment endpoints.',
    tags: ['health', 'users', 'services', 'staff', 'appointments'],
  });

  await app.listen(config.get<number>('API_PORT', 7310));
}
void bootstrap();
