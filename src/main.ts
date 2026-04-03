import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { configureApplication } from './common/bootstrap/configure-application';
import { configureSwagger } from './common/bootstrap/configure-swagger';
import { getAppRuntimeConfig } from './config/runtime-config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  configureApplication(app);
  configureSwagger(app);

  const configService = app.get(ConfigService);
  const { port, frontendUrl } = getAppRuntimeConfig(configService);

  app.enableCors({
    origin: frontendUrl,
    credentials: true,
  });

  await app.listen(port);
}
void bootstrap();
