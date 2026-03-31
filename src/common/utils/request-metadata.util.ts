import type { ApiMeta } from '../types/api-envelope.type';
import { REQUEST_ID_HEADER } from '../constants/request.constants';
import type { RequestWithContext } from '../types/request-context.type';

const FALLBACK_REQUEST_ID = 'req_unknown';

export function getRequestId(request?: RequestWithContext): string {
  if (request?.requestId) {
    return request.requestId;
  }

  const headerValue = request?.headers?.[REQUEST_ID_HEADER];

  if (typeof headerValue === 'string' && headerValue.length > 0) {
    return headerValue;
  }

  if (Array.isArray(headerValue) && headerValue[0]) {
    return headerValue[0];
  }

  return FALLBACK_REQUEST_ID;
}

export function buildApiMeta(request?: RequestWithContext): ApiMeta {
  return {
    requestId: getRequestId(request),
    timestamp: new Date().toISOString(),
  };
}
