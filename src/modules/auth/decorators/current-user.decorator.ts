import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import { createUnauthenticatedException } from '../../../common/utils/api-exception.util';
import type { AuthenticatedRequest } from '../types/authenticated-request.type';

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext) => {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    if (!request.user) {
      throw createUnauthenticatedException({
        message: 'Authentication is required',
      });
    }

    return request.user;
  },
);
