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

  const rawFrontendUrl = config.get<string>('FRONTEND_URL');
  const frontendUrl: string =
    typeof rawFrontendUrl === 'string'
      ? rawFrontendUrl
      : 'http://localhost:5173';

  const rawAuthApiPort = config.get<number>('AUTH_API_PORT');
  const authApiPort: number =
    typeof rawAuthApiPort === 'number' ? rawAuthApiPort : 3002;

  const corsOptions = createFrontendCorsOptions(frontendUrl);

  configureApiSecurity(app, {
    cors: corsOptions,
  });

  await app.listen(authApiPort);
}

void bootstrap();
