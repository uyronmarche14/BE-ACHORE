import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { map, type Observable } from 'rxjs';
import type { ApiEnvelope } from '../types/api-envelope.type';
import { buildApiMeta } from '../utils/request-metadata.util';
import type { RequestWithContext } from '../types/request-context.type';

type SuccessEnvelopeCandidate = Partial<ApiEnvelope<unknown>> & {
  success?: boolean;
};

@Injectable()
export class ResponseEnvelopeInterceptor<T> implements NestInterceptor<
  T,
  ApiEnvelope<T>
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ApiEnvelope<T>> {
    const request = context.switchToHttp().getRequest<RequestWithContext>();

    return next.handle().pipe(
      map((data) => {
        if (this.isApiEnvelope(data)) {
          return data;
        }

        return {
          success: true,
          data,
          meta: buildApiMeta(request),
          error: null,
        };
      }),
    );
  }

  private isApiEnvelope(value: unknown): value is ApiEnvelope<T> {
    if (!value || typeof value !== 'object') {
      return false;
    }

    const candidate = value as SuccessEnvelopeCandidate;

    return (
      typeof candidate.success === 'boolean' &&
      'data' in candidate &&
      'meta' in candidate &&
      'error' in candidate
    );
  }
}
