import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { HealthService, type HealthStatus } from '../service/health.service';

describe('HealthController', () => {
  let healthController: HealthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [HealthService],
    }).compile();

    healthController = module.get<HealthController>(HealthController);
  });

  it('returns the health payload', () => {
    const response = healthController.getHealth();

    expect(response).toEqual<HealthStatus>({
      status: 'ok',
      service: 'archon-backend',
    });
  });
});
