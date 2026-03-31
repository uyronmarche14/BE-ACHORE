import type { RequestWithContext } from '../../../common/types/request-context.type';
import type { AuthUserResponse } from './auth-response.type';

export type AuthorizedProjectContext = {
  projectId: string;
  ownerId: string;
};

export type AuthorizedTaskContext = {
  taskId: string;
  projectId: string;
};

export type AuthenticatedRequest = RequestWithContext & {
  user?: AuthUserResponse;
  authorizedProject?: AuthorizedProjectContext;
  authorizedTask?: AuthorizedTaskContext;
};
