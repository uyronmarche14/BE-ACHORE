import { Controller, Get } from '@nestjs/common';
import { HealthService } from '../service/health.service';
import type { HealthResponse } from '../service/health.service';

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  getHealth(): HealthResponse {
    return this.healthService.getHealthStatus();
  }
}
