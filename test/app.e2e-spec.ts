import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { HealthController } from './../src/modules/health/controller/health.controller';
import { AppModule } from './../src/app.module';

describe('App bootstrap (e2e)', () => {
  let app: INestApplication;
  let healthController: HealthController;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    await app.init();
    healthController = app.get(HealthController);
  });

  it('wires the health module into the application', () => {
    const responseBody = healthController.getHealth();

    expect(responseBody.success).toBe(true);
    expect(responseBody.data).toEqual({
      status: 'ok',
      service: 'archon-backend',
    });
    expect(responseBody.meta.requestId).toBe('health-check');
    expect(responseBody.meta.timestamp).toEqual(expect.any(String));
    expect(responseBody.error).toBeNull();
  });

  afterEach(async () => {
    await app.close();
  });
});
