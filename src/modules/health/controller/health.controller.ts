import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiEnvelopedResponse } from '../../../common/swagger/decorators/api-enveloped-response.decorator';
import { HealthService } from '../service/health.service';
import type { HealthStatus } from '../service/health.service';
import { SwaggerHealthResponseDto } from '../swagger/health-response.models';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({
    summary: 'Read the backend health status.',
  })
  @ApiEnvelopedResponse({
    description: 'Service health loaded successfully.',
    type: SwaggerHealthResponseDto,
  })
  getHealth(): HealthStatus {
    return this.healthService.getHealthStatus();
  }
}
