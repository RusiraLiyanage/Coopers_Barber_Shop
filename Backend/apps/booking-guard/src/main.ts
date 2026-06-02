import {
  configureApiSecurity,
  configureSwagger,
  createFrontendCorsOptions,
  ensureNodeCryptoGlobal,
  GuardConfigService,
} from '@coopers/common';

ensureNodeCryptoGlobal();

async function bootstrap() {
  const [{ NestFactory }, { AppModule }] = await Promise.all([
    import('@nestjs/core'),
    import('./app.module.js'),
  ]);

  const app = await NestFactory.create(AppModule);
  const guardConfig = app.get(GuardConfigService);

  // Validate upstream URLs at startup before proxy routes depend on them.
  guardConfig.getUpstreams();

  configureApiSecurity(app, {
    cors: createFrontendCorsOptions(guardConfig.frontendUrl),
  });
  configureSwagger(app, {
    title: "Cooper's Barbershop Booking Guard",
    description:
      'Frontend-facing guard service for booking request routing and access control.',
    tags: ['health', 'guard-public-proxy', 'guard-protected-proxy'],
  });

  await app.listen(guardConfig.guardPort);
}

void bootstrap();
