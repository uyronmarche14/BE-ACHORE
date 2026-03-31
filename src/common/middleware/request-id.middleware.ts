import { Injectable, type NestMiddleware } from '@nestjs/common';
import type { NextFunction, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { REQUEST_ID_HEADER } from '../constants/request.constants';
import type { RequestWithContext } from '../types/request-context.type';

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(request: RequestWithContext, response: Response, next: NextFunction) {
    const requestId = this.resolveRequestId(request);

    request.requestId = requestId;
    response.setHeader(REQUEST_ID_HEADER, requestId);

    next();
  }

  private resolveRequestId(request: RequestWithContext): string {
    const headerValue = request.headers[REQUEST_ID_HEADER];

    if (typeof headerValue === 'string' && headerValue.length > 0) {
      return headerValue;
    }

    if (Array.isArray(headerValue) && headerValue[0]) {
      return headerValue[0];
    }

    return `req_${randomUUID()}`;
  }
}
