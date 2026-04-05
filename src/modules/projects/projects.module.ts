import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ProjectsController } from './controller/projects.controller';
import { ProjectActivityService } from './service/project-activity.service';
import { ProjectMutationsService } from './service/project-mutations.service';
import { ProjectQueriesService } from './service/project-queries.service';
import { ProjectStatusesService } from './service/project-statuses.service';
import { ProjectsService } from './service/projects.service';

@Module({
  imports: [AuthModule],
  controllers: [ProjectsController],
  providers: [
    ProjectsService,
    ProjectQueriesService,
    ProjectMutationsService,
    ProjectStatusesService,
    ProjectActivityService,
  ],
})
export class ProjectsModule {}
