import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import {
  environmentValidationSchema,
  getEnvironmentFilePaths,
} from './config/environment';
import { HealthModule } from './modules/health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      envFilePath: getEnvironmentFilePaths(),
      validationSchema: environmentValidationSchema,
      expandVariables: true,
    }),
    HealthModule,
  ],
})
export class AppModule {}
