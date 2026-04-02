import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';
import {
  environmentValidationSchema,
  getEnvironmentFilePaths,
} from './config/environment';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './modules/auth/auth.module';
import { HealthModule } from './modules/health/health.module';
import { MailModule } from './modules/mail/mail.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { ProjectInvitesModule } from './modules/project-invites/project-invites.module';
import { SeedModule } from './modules/seed/seed.module';
import { TaskLogsModule } from './modules/task-logs/task-logs.module';
import { TasksModule } from './modules/tasks/tasks.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      envFilePath: getEnvironmentFilePaths(),
      validationSchema: environmentValidationSchema,
      expandVariables: true,
    }),
    DatabaseModule,
    AuthModule,
    HealthModule,
    MailModule,
    ProjectsModule,
    ProjectInvitesModule,
    SeedModule,
    TaskLogsModule,
    TasksModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
