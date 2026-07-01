import {
  configureApiSecurity,
  configureSwagger,
  configureTrustProxy,
  createFrontendCorsOptions,
  createHealthResponse,
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
  const expressApp = app.getHttpAdapter().getInstance() as {
    get?: (
      path: string,
      handler: (_request: unknown, response: unknown) => void,
    ) => void;
  };

  // Keep load-balancer probes out of the global middleware/guard path. Staging
  // ALB health checks are intentionally cheap and must not be affected by API
  // throttling, request sanitisation, or proxy routes.
  expressApp.get?.('/health', (_request, response) => {
    (response as { json: (body: unknown) => void }).json(
      createHealthResponse('booking-guard'),
    );
  });

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
