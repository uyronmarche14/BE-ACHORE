import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { ApiEnvelopedResponse } from '../../../common/swagger/decorators/api-enveloped-response.decorator';
import { ApiTaskIdParam } from '../../../common/swagger/decorators/api-parameter.decorators';
import { ApiStandardErrorResponses } from '../../../common/swagger/decorators/api-standard-error-responses.decorator';
import { SWAGGER_BEARER_AUTH_NAME } from '../../../common/swagger/swagger.constants';
import { RequireTaskAccess } from '../../auth/decorators/resource-access.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ResourceAccessGuard } from '../../auth/guards/resource-access.guard';
import { GetTaskLogsQueryDto } from '../dto/get-task-logs-query.dto';
import { TaskLogsService } from '../service/task-logs.service';
import type { TaskLogsResponse } from '../types/task-log-response.type';
import {
  SwaggerTaskLogAssigneeValueDto,
  SwaggerTaskLogsResponseDto,
} from '../swagger/task-log-response.models';

@ApiTags('Task Logs')
@ApiBearerAuth(SWAGGER_BEARER_AUTH_NAME)
@Controller()
export class TaskLogsController {
  constructor(private readonly taskLogsService: TaskLogsService) {}

  @Get('tasks/:taskId/logs')
  @UseGuards(JwtAuthGuard, ResourceAccessGuard)
  @RequireTaskAccess()
  @ApiOperation({
    summary: 'List paginated task activity logs.',
  })
  @ApiTaskIdParam()
  @ApiEnvelopedResponse({
    description: 'Task logs loaded successfully.',
    extraModels: [SwaggerTaskLogAssigneeValueDto],
    type: SwaggerTaskLogsResponseDto,
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
    description: 'Number of task log entries per page.',
  })
  @ApiStandardErrorResponses([401, 403, 404])
  listTaskLogs(
    @Param('taskId') taskId: string,
    @Query() query: GetTaskLogsQueryDto,
  ): Promise<TaskLogsResponse> {
    return this.taskLogsService.listTaskLogs(taskId, query);
  }
}
