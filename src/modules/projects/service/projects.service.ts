import { Injectable } from '@nestjs/common';
import type { AuthUserResponse } from '../../auth/types/auth-response.type';
import type { CreateProjectDto } from '../dto/create-project.dto';
import type { CreateProjectStatusDto } from '../dto/create-project-status.dto';
import type { DeleteProjectStatusDto } from '../dto/delete-project-status.dto';
import type { GetProjectActivityQueryDto } from '../dto/get-project-activity-query.dto';
import type { ReorderProjectStatusesDto } from '../dto/reorder-project-statuses.dto';
import type { UpdateProjectDto } from '../dto/update-project.dto';
import type { UpdateProjectStatusDto } from '../dto/update-project-status.dto';
import type {
  DeleteProjectResponse,
  ProjectActivityResponse,
  ProjectDetailResponse,
  ProjectListResponse,
  ProjectStatusListResponse,
  ProjectStatusSummaryResponse,
  ProjectSummaryResponse,
} from '../types/project-response.type';
import { ProjectActivityService } from './project-activity.service';
import { ProjectMutationsService } from './project-mutations.service';
import { ProjectQueriesService } from './project-queries.service';
import { ProjectStatusesService } from './project-statuses.service';

@Injectable()
export class ProjectsService {
  constructor(
    private readonly projectQueriesService: ProjectQueriesService,
    private readonly projectMutationsService: ProjectMutationsService,
    private readonly projectStatusesService: ProjectStatusesService,
    private readonly projectActivityService: ProjectActivityService,
  ) {}

  createProject(
    currentUser: AuthUserResponse,
    createProjectDto: CreateProjectDto,
  ): Promise<ProjectSummaryResponse> {
    return this.projectMutationsService.createProject(
      currentUser,
      createProjectDto,
    );
  }

  listProjects(currentUser: AuthUserResponse): Promise<ProjectListResponse> {
    return this.projectQueriesService.listProjects(currentUser);
  }

  getProjectDetail(projectId: string): Promise<ProjectDetailResponse> {
    return this.projectQueriesService.getProjectDetail(projectId);
  }

  createProjectStatus(
    projectId: string,
    createProjectStatusDto: CreateProjectStatusDto,
  ): Promise<ProjectStatusSummaryResponse> {
    return this.projectStatusesService.createProjectStatus(
      projectId,
      createProjectStatusDto,
    );
  }

  updateProjectStatus(
    projectId: string,
    statusId: string,
    updateProjectStatusDto: UpdateProjectStatusDto,
  ): Promise<ProjectStatusSummaryResponse> {
    return this.projectStatusesService.updateProjectStatus(
      projectId,
      statusId,
      updateProjectStatusDto,
    );
  }

  reorderProjectStatuses(
    projectId: string,
    reorderProjectStatusesDto: ReorderProjectStatusesDto,
  ): Promise<ProjectStatusListResponse> {
    return this.projectStatusesService.reorderProjectStatuses(
      projectId,
      reorderProjectStatusesDto,
    );
  }

  deleteProjectStatus(
    projectId: string,
    statusId: string,
    deleteProjectStatusDto: DeleteProjectStatusDto,
  ): Promise<DeleteProjectResponse> {
    return this.projectStatusesService.deleteProjectStatus(
      projectId,
      statusId,
      deleteProjectStatusDto,
    );
  }

  updateProject(
    currentUser: AuthUserResponse,
    projectId: string,
    updateProjectDto: UpdateProjectDto,
  ): Promise<ProjectSummaryResponse> {
    return this.projectMutationsService.updateProject(
      currentUser,
      projectId,
      updateProjectDto,
    );
  }

  deleteProject(projectId: string): Promise<DeleteProjectResponse> {
    return this.projectMutationsService.deleteProject(projectId);
  }

  getProjectActivity(
    projectId: string,
    query: GetProjectActivityQueryDto,
  ): Promise<ProjectActivityResponse> {
    return this.projectActivityService.getProjectActivity(projectId, query);
  }
}
