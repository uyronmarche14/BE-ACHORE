import { Controller, Post } from '@nestjs/common';
import { SeedService } from '../service/seed.service';
import type { SeedInitResponse } from '../types/seed-response.type';

@Controller('seed')
export class SeedController {
  constructor(private readonly seedService: SeedService) {}

  @Post('init')
  initializeSeedData(): Promise<SeedInitResponse> {
    return this.seedService.initializeDemoData();
  }
}
