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
import { TaskLogEventType } from '@prisma/client';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { ApiEnvelopedResponse } from '../../../common/swagger/decorators/api-enveloped-response.decorator';
import { ApiProjectIdParam } from '../../../common/swagger/decorators/api-parameter.decorators';
import { ApiStandardErrorResponses } from '../../../common/swagger/decorators/api-standard-error-responses.decorator';
import { SWAGGER_BEARER_AUTH_NAME } from '../../../common/swagger/swagger.constants';
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
import {
  SwaggerDeleteProjectResponseDto,
  SwaggerProjectActivityResponseDto,
  SwaggerProjectDetailResponseDto,
  SwaggerProjectListResponseDto,
  SwaggerProjectSummaryResponseDto,
  swaggerProjectActivityExtraModels,
} from '../swagger/project-response.models';

@ApiTags('Projects')
@ApiBearerAuth(SWAGGER_BEARER_AUTH_NAME)
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Create a new project.',
  })
  @ApiEnvelopedResponse({
    status: 201,
    description: 'Project created successfully.',
    type: SwaggerProjectSummaryResponseDto,
  })
  @ApiStandardErrorResponses([400, 401])
  createProject(
    @CurrentUser() currentUser: AuthUserResponse,
    @Body() createProjectDto: CreateProjectDto,
  ): Promise<ProjectSummaryResponse> {
    return this.projectsService.createProject(currentUser, createProjectDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'List projects visible to the current user.',
  })
  @ApiEnvelopedResponse({
    description: 'Projects loaded successfully.',
    type: SwaggerProjectListResponseDto,
  })
  @ApiStandardErrorResponses([401])
  listProjects(
    @CurrentUser() currentUser: AuthUserResponse,
  ): Promise<ProjectListResponse> {
    return this.projectsService.listProjects(currentUser);
  }

  @Get(':projectId/activity')
  @UseGuards(JwtAuthGuard, ResourceAccessGuard)
  @RequireProjectAccess()
  @ApiOperation({
    summary: 'List paginated project activity entries.',
  })
  @ApiProjectIdParam()
  @ApiEnvelopedResponse({
    description: 'Project activity loaded successfully.',
    extraModels: [...swaggerProjectActivityExtraModels],
    type: SwaggerProjectActivityResponseDto,
  })
  @ApiQuery({
    name: 'page',
    required: false,
    schema: {
      type: 'integer',
      minimum: 1,
    },
    description: 'Page number to fetch.',
  })
  @ApiQuery({
    name: 'pageSize',
    required: false,
    schema: {
      type: 'integer',
      minimum: 1,
      maximum: 50,
    },
    description: 'Number of activity entries per page.',
  })
  @ApiQuery({
    name: 'eventType',
    required: false,
    enum: TaskLogEventType,
    description: 'Optional activity event type filter.',
  })
  @ApiQuery({
    name: 'q',
    required: false,
    schema: {
      type: 'string',
      maxLength: 120,
    },
    description: 'Optional text search across summaries and task titles.',
  })
  @ApiStandardErrorResponses([401, 403, 404])
  getProjectActivity(
    @Param('projectId') projectId: string,
    @Query() query: GetProjectActivityQueryDto,
  ): Promise<ProjectActivityResponse> {
    return this.projectsService.getProjectActivity(projectId, query);
  }

  @Get(':projectId')
  @UseGuards(JwtAuthGuard, ResourceAccessGuard)
  @RequireProjectAccess()
  @ApiOperation({
    summary: 'Get a project detail view with members and grouped tasks.',
  })
  @ApiProjectIdParam()
  @ApiEnvelopedResponse({
    description: 'Project detail loaded successfully.',
    type: SwaggerProjectDetailResponseDto,
  })
  @ApiStandardErrorResponses([401, 403, 404])
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
  @ApiOperation({
    summary: 'Update project metadata.',
  })
  @ApiProjectIdParam()
  @ApiEnvelopedResponse({
    description: 'Project updated successfully.',
    type: SwaggerProjectSummaryResponseDto,
  })
  @ApiStandardErrorResponses([400, 401, 403, 404])
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
  @ApiOperation({
    summary: 'Delete a project.',
  })
  @ApiProjectIdParam()
  @ApiEnvelopedResponse({
    description: 'Project deleted successfully.',
    type: SwaggerDeleteProjectResponseDto,
  })
  @ApiStandardErrorResponses([401, 403, 404])
  deleteProject(
    @Param('projectId') projectId: string,
  ): Promise<DeleteProjectResponse> {
    return this.projectsService.deleteProject(projectId);
  }
}
