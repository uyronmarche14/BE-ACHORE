export type ApiErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR';

export type ApiMeta = {
  requestId: string;
  timestamp: string;
};

export type ApiErrorDetails =
  | Record<string, string[]>
  | Record<string, unknown>
  | null;

export type ApiErrorPayload = {
  code: ApiErrorCode;
  message: string;
  details: ApiErrorDetails;
};

export type ApiSuccessEnvelope<T> = {
  success: true;
  data: T;
  meta: ApiMeta;
  error: null;
};

export type ApiErrorEnvelope = {
  success: false;
  data: null;
  meta: ApiMeta;
  error: ApiErrorPayload;
};

export type ApiEnvelope<T> = ApiSuccessEnvelope<T> | ApiErrorEnvelope;
