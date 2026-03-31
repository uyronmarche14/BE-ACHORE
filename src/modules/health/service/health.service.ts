import { Injectable } from '@nestjs/common';

export type HealthStatus = {
  status: 'ok';
  service: 'archon-backend';
};

@Injectable()
export class HealthService {
  getHealthStatus(): HealthStatus {
    return {
      status: 'ok',
      service: 'archon-backend',
    };
  }
}
