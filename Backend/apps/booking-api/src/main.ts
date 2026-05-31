import { ConfigService } from '@nestjs/config';
import {
  configureApiSecurity,
  createFrontendCorsOptions,
  ensureNodeCryptoGlobal,
} from '@coopers/common';

ensureNodeCryptoGlobal();

async function bootstrap() {
  const [{ NestFactory }, { AppModule }] = await Promise.all([
    import('@nestjs/core'),
    import('./app.module.js'),
  ]);
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  configureApiSecurity(app, {
    cors: createFrontendCorsOptions(
      config.get<string>('FRONTEND_URL', 'http://localhost:5173'),
    ),
  });

  await app.listen(config.get<number>('API_PORT', 3000));
}
void bootstrap();
