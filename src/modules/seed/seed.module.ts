import { Module } from '@nestjs/common';
import { TaskLogsModule } from '../task-logs/task-logs.module';
import { SeedController } from './controller/seed.controller';
import { SeedService } from './service/seed.service';

@Module({
  imports: [TaskLogsModule],
  controllers: [SeedController],
  providers: [SeedService],
})
export class SeedModule {}
