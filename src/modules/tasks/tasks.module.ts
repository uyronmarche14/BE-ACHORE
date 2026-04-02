import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { TaskLogsModule } from '../task-logs/task-logs.module';
import { TasksController } from './controller/tasks.controller';
import { TasksService } from './service/tasks.service';

@Module({
  imports: [AuthModule, TaskLogsModule],
  controllers: [TasksController],
  providers: [TasksService],
})
export class TasksModule {}
