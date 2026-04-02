import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { RequireTaskAccess } from '../../auth/decorators/resource-access.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ResourceAccessGuard } from '../../auth/guards/resource-access.guard';
import { GetTaskLogsQueryDto } from '../dto/get-task-logs-query.dto';
import { TaskLogsService } from '../service/task-logs.service';
import type { TaskLogsResponse } from '../types/task-log-response.type';

@Controller()
export class TaskLogsController {
  constructor(private readonly taskLogsService: TaskLogsService) {}

  @Get('tasks/:taskId/logs')
  @UseGuards(JwtAuthGuard, ResourceAccessGuard)
  @RequireTaskAccess()
  listTaskLogs(
    @Param('taskId') taskId: string,
    @Query() query: GetTaskLogsQueryDto,
  ): Promise<TaskLogsResponse> {
    return this.taskLogsService.listTaskLogs(taskId, query);
  }
}
