import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { getAppRuntimeConfig } from './config/runtime-config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api/v1');

  const configService = app.get(ConfigService);
  const { port } = getAppRuntimeConfig(configService);

  await app.listen(port);
}
void bootstrap();
