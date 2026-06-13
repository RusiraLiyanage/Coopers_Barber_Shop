import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export type ApiSwaggerOptions = {
  title: string;
  description: string;
  version?: string;
  path?: string;
  tags?: string[];
  bearerAuth?: boolean;
};

export function configureSwagger(
  app: INestApplication,
  options: ApiSwaggerOptions,
): void {
  const documentBuilder = new DocumentBuilder()
    .setTitle(options.title)
    .setDescription(options.description)
    .setVersion(options.version ?? '1.0.0');

  if (options.bearerAuth !== false) {
    documentBuilder.addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
      'access-token',
    );
  }

  for (const tag of options.tags ?? []) {
    documentBuilder.addTag(tag);
  }

  const document = SwaggerModule.createDocument(app, documentBuilder.build());

  SwaggerModule.setup(options.path ?? 'docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true, // keep the authorization bearer token even after refreshing the page
    },
  });
}
