import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export type ApiSwaggerOptions = {
  title: string;
  description: string;
  version?: string;
  path?: string;
  tags?: string[];
};

export function configureSwagger(
  app: INestApplication,
  options: ApiSwaggerOptions,
): void {
  const documentBuilder = new DocumentBuilder()
    .setTitle(options.title)
    .setDescription(options.description)
    .setVersion(options.version ?? '1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
      'access-token',
    );

  for (const tag of options.tags ?? []) {
    documentBuilder.addTag(tag);
  }

  const document = SwaggerModule.createDocument(app, documentBuilder.build());

  SwaggerModule.setup(options.path ?? 'docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });
}
