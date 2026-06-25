import {
  configureApiSecurity,
  configureSwagger,
  configureTrustProxy,
  createFrontendCorsOptions,
  ensureNodeCryptoGlobal,
  GuardConfigService,
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
  const guardConfig = app.get(GuardConfigService);

  // This is the only browser-facing service and it sits behind a reverse proxy in
  // staging/production, so honour X-Forwarded-For (via TRUST_PROXY) to throttle on
  // the real client IP instead of the proxy's.
  configureTrustProxy(app);

  // Validate upstream URLs at startup before proxy routes depend on them.
  guardConfig.getUpstreams();
  const allowedFrontendOrigins = [
    guardConfig.frontendUrl,
    guardConfig.adminFrontendUrl,
  ].join(',');

  configureApiSecurity(app, {
    cors: createFrontendCorsOptions(allowedFrontendOrigins),
    helmet: {
      contentSecurityPolicy: false,
    },
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
