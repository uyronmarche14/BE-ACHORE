import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { configureApplication } from './common/bootstrap/configure-application';
import { getAppRuntimeConfig } from './config/runtime-config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  configureApplication(app);

  const configService = app.get(ConfigService);
  const { port } = getAppRuntimeConfig(configService);

  await app.listen(port);
}
void bootstrap();
