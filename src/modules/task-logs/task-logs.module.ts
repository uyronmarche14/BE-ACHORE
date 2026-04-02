import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { TaskLogsController } from './controller/task-logs.controller';
import { TaskLogsService } from './service/task-logs.service';

@Module({
  imports: [AuthModule],
  controllers: [TaskLogsController],
  providers: [TaskLogsService],
  exports: [TaskLogsService],
})
export class TaskLogsModule {}
