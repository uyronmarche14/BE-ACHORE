import { Injectable } from '@nestjs/common';

export type HealthResponse = {
  success: true;
  data: {
    status: 'ok';
    service: 'archon-backend';
  };
  meta: {
    requestId: 'health-check';
    timestamp: string;
  };
  error: null;
};

@Injectable()
export class HealthService {
  getHealthStatus(): HealthResponse {
    return {
      success: true,
      data: {
        status: 'ok',
        service: 'archon-backend',
      },
      meta: {
        requestId: 'health-check',
        timestamp: new Date().toISOString(),
      },
      error: null,
    };
  }
}
