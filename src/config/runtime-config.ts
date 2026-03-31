import { ConfigService } from '@nestjs/config';

export type AppRuntimeConfig = {
  port: number;
  appUrl: string;
  frontendUrl: string;
  nodeEnv: 'development' | 'test' | 'production';
};

export function getAppRuntimeConfig(
  configService: ConfigService,
): AppRuntimeConfig {
  return {
    port: configService.getOrThrow<number>('PORT'),
    appUrl: configService.getOrThrow<string>('APP_URL'),
    frontendUrl: configService.getOrThrow<string>('FRONTEND_URL'),
    nodeEnv: configService.getOrThrow<'development' | 'test' | 'production'>(
      'NODE_ENV',
    ),
  };
}
