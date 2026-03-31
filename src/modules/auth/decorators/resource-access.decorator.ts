import { SetMetadata } from '@nestjs/common';
import { RESOURCE_ACCESS_METADATA } from '../constants/auth-metadata.constant';
import type { ResourceAccessMetadata } from '../types/resource-access.type';

type ProjectAccessOptions = {
  param?: string;
  ownerOnly?: boolean;
};

type TaskAccessOptions = {
  param?: string;
};

export function RequireProjectAccess(
  options: ProjectAccessOptions = {},
): MethodDecorator & ClassDecorator {
  const metadata: ResourceAccessMetadata = {
    resource: 'project',
    param: options.param ?? 'projectId',
    ownerOnly: options.ownerOnly ?? false,
  };

  return SetMetadata(RESOURCE_ACCESS_METADATA, metadata);
}

export function RequireTaskAccess(
  options: TaskAccessOptions = {},
): MethodDecorator & ClassDecorator {
  const metadata: ResourceAccessMetadata = {
    resource: 'task',
    param: options.param ?? 'taskId',
    ownerOnly: false,
  };

  return SetMetadata(RESOURCE_ACCESS_METADATA, metadata);
}
