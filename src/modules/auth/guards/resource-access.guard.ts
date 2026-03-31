import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RESOURCE_ACCESS_METADATA } from '../constants/auth-metadata.constant';
import { ResourceAuthorizationService } from '../service/resource-authorization.service';
import type { AuthenticatedRequest } from '../types/authenticated-request.type';
import type { ResourceAccessMetadata } from '../types/resource-access.type';

@Injectable()
export class ResourceAccessGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly resourceAuthorizationService: ResourceAuthorizationService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const metadata = this.reflector.getAllAndOverride<ResourceAccessMetadata>(
      RESOURCE_ACCESS_METADATA,
      [context.getHandler(), context.getClass()],
    );

    if (!metadata) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    if (!request.user) {
      throw new UnauthorizedException({
        code: 'UNAUTHENTICATED',
        message: 'Authentication is required',
        details: null,
      });
    }

    const resourceId = request.params?.[metadata.param];

    if (typeof resourceId !== 'string' || resourceId.length === 0) {
      throw new UnauthorizedException({
        code: 'UNAUTHENTICATED',
        message: 'Authentication is required',
        details: null,
      });
    }

    if (metadata.resource === 'project') {
      request.authorizedProject =
        await this.resourceAuthorizationService.assertProjectAccess(
          resourceId,
          request.user,
          {
            ownerOnly: metadata.ownerOnly,
          },
        );

      return true;
    }

    request.authorizedTask =
      await this.resourceAuthorizationService.assertTaskAccess(
        resourceId,
        request.user,
      );

    return true;
  }
}
