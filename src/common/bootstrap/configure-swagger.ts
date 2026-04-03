import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { getAppRuntimeConfig } from '../../config/runtime-config';
import { AuthModule } from '../../modules/auth/auth.module';
import { HealthModule } from '../../modules/health/health.module';
import { ProjectInvitesModule } from '../../modules/project-invites/project-invites.module';
import { ProjectsModule } from '../../modules/projects/projects.module';
import { TaskLogsModule } from '../../modules/task-logs/task-logs.module';
import { TasksModule } from '../../modules/tasks/tasks.module';
import {
  SWAGGER_BEARER_AUTH_NAME,
  SWAGGER_JSON_PATH,
  SWAGGER_REFRESH_COOKIE_AUTH_NAME,
  SWAGGER_UI_PATH,
} from '../swagger/swagger.constants';

export function configureSwagger(app: INestApplication) {
  const configService = app.get(ConfigService);
  const { appUrl, refreshCookieName, swaggerEnabled } =
    getAppRuntimeConfig(configService);

  if (!swaggerEnabled) {
    return;
  }

  const config = new DocumentBuilder()
    .setTitle('Archon API')
    .setDescription('OpenAPI documentation for the Archon backend API.')
    .setVersion('1.0.0')
    .addServer(appUrl)
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT access token used for protected API routes.',
      },
      SWAGGER_BEARER_AUTH_NAME,
    )
    .addCookieAuth(
      refreshCookieName,
      {
        type: 'apiKey',
        in: 'cookie',
        description:
          'HTTP-only refresh token cookie used for session rotation routes.',
      },
      SWAGGER_REFRESH_COOKIE_AUTH_NAME,
    )
    .build();

  const document = SwaggerModule.createDocument(app, config, {
    include: [
      AuthModule,
      HealthModule,
      ProjectsModule,
      ProjectInvitesModule,
      TasksModule,
      TaskLogsModule,
    ],
    operationIdFactory: (_controllerKey, methodKey) => methodKey,
  });

  SwaggerModule.setup(SWAGGER_UI_PATH, app, document, {
    raw: ['json'],
    jsonDocumentUrl: SWAGGER_JSON_PATH,
    customSiteTitle: 'Archon API Docs',
  });
}
