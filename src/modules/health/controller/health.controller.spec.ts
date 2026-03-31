import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { HealthResponse, HealthService } from '../service/health.service';

describe('HealthController', () => {
  let healthController: HealthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [HealthService],
    }).compile();

    healthController = module.get<HealthController>(HealthController);
  });

  it('returns the standard health envelope', () => {
    const response = healthController.getHealth();

    expect(response.success).toBe(true);
    expect(response.data).toEqual<HealthResponse['data']>({
      status: 'ok',
      service: 'archon-backend',
    });
    expect(response.meta.requestId).toBe('health-check');
    expect(response.meta.timestamp).toEqual(expect.any(String));
    expect(response.error).toBeNull();
  });
});
