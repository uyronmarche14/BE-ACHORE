import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { RequireProjectAccess } from '../../auth/decorators/resource-access.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ResourceAccessGuard } from '../../auth/guards/resource-access.guard';
import type { AuthUserResponse } from '../../auth/types/auth-response.type';
import { CreateProjectDto } from '../dto/create-project.dto';
import { GetProjectActivityQueryDto } from '../dto/get-project-activity-query.dto';
import { UpdateProjectDto } from '../dto/update-project.dto';
import { ProjectsService } from '../service/projects.service';
import type {
  DeleteProjectResponse,
  ProjectActivityResponse,
  ProjectDetailResponse,
  ProjectListResponse,
  ProjectSummaryResponse,
} from '../types/project-response.type';

@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  createProject(
    @CurrentUser() currentUser: AuthUserResponse,
    @Body() createProjectDto: CreateProjectDto,
  ): Promise<ProjectSummaryResponse> {
    return this.projectsService.createProject(currentUser, createProjectDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  listProjects(
    @CurrentUser() currentUser: AuthUserResponse,
  ): Promise<ProjectListResponse> {
    return this.projectsService.listProjects(currentUser);
  }

  @Get(':projectId/activity')
  @UseGuards(JwtAuthGuard, ResourceAccessGuard)
  @RequireProjectAccess()
  getProjectActivity(
    @Param('projectId') projectId: string,
    @Query() query: GetProjectActivityQueryDto,
  ): Promise<ProjectActivityResponse> {
    return this.projectsService.getProjectActivity(projectId, query);
  }

  @Get(':projectId')
  @UseGuards(JwtAuthGuard, ResourceAccessGuard)
  @RequireProjectAccess()
  getProjectDetail(
    @Param('projectId') projectId: string,
  ): Promise<ProjectDetailResponse> {
    return this.projectsService.getProjectDetail(projectId);
  }

  @Put(':projectId')
  @UseGuards(JwtAuthGuard, ResourceAccessGuard)
  @RequireProjectAccess({
    ownerOnly: true,
  })
  updateProject(
    @CurrentUser() currentUser: AuthUserResponse,
    @Param('projectId') projectId: string,
    @Body() updateProjectDto: UpdateProjectDto,
  ): Promise<ProjectSummaryResponse> {
    return this.projectsService.updateProject(
      currentUser,
      projectId,
      updateProjectDto,
    );
  }

  @Delete(':projectId')
  @UseGuards(JwtAuthGuard, ResourceAccessGuard)
  @RequireProjectAccess({
    ownerOnly: true,
  })
  deleteProject(
    @Param('projectId') projectId: string,
  ): Promise<DeleteProjectResponse> {
    return this.projectsService.deleteProject(projectId);
  }
}
