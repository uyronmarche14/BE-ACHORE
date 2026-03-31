import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';
import type { ApiErrorCode, ApiErrorPayload } from '../types/api-envelope.type';
import { mapHttpStatusToErrorCode } from '../utils/api-error.util';
import { buildApiMeta } from '../utils/request-metadata.util';
import type { RequestWithContext } from '../types/request-context.type';

type HttpExceptionResponseShape = {
  code?: ApiErrorCode;
  message?: string | string[];
  details?: Record<string, unknown> | null;
};

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const http = host.switchToHttp();
    const request = http.getRequest<RequestWithContext>();
    const response = http.getResponse<Response>();
    const statusCode = this.getStatusCode(exception);

    response.status(statusCode).json({
      success: false,
      data: null,
      meta: buildApiMeta(request),
      error: this.buildErrorPayload(exception, statusCode),
    });
  }

  private getStatusCode(exception: unknown): number {
    if (exception instanceof HttpException) {
      return exception.getStatus();
    }

    return HttpStatus.INTERNAL_SERVER_ERROR;
  }

  private buildErrorPayload(
    exception: unknown,
    statusCode: number,
  ): ApiErrorPayload {
    if (exception instanceof HttpException) {
      const exceptionResponse = exception.getResponse() as
        | HttpExceptionResponseShape
        | string;

      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const message = Array.isArray(exceptionResponse.message)
          ? exceptionResponse.message.join(', ')
          : exceptionResponse.message;

        return {
          code: exceptionResponse.code ?? mapHttpStatusToErrorCode(statusCode),
          message: message ?? exception.message,
          details:
            exceptionResponse.details ??
            (Array.isArray(exceptionResponse.message)
              ? { message: exceptionResponse.message }
              : null),
        };
      }

      return {
        code: mapHttpStatusToErrorCode(statusCode),
        message:
          typeof exceptionResponse === 'string'
            ? exceptionResponse
            : exception.message,
        details: null,
      };
    }

    return {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
      details: null,
    };
  }
}
