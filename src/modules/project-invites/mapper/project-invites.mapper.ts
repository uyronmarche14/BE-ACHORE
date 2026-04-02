import type {
  AcceptInviteResponse,
  CreateProjectInviteResponse,
  InvitePreviewResponse,
} from '../types/project-invite-response.type';

export function mapCreateProjectInviteResponse(input: {
  email: string;
  expiresAt: Date;
}): CreateProjectInviteResponse {
  return {
    message: 'Invite sent successfully',
    email: input.email,
    expiresAt: input.expiresAt.toISOString(),
  };
}

export function mapInvitePreviewResponse(input: {
  project: {
    id: string;
    name: string;
  };
  email: string;
  role: 'OWNER' | 'MEMBER';
  expiresAt: Date;
  invitedBy: {
    id: string;
    name: string;
  };
}): InvitePreviewResponse {
  return {
    project: input.project,
    email: input.email,
    role: input.role,
    expiresAt: input.expiresAt.toISOString(),
    invitedBy: input.invitedBy,
  };
}

export function mapAcceptInviteResponse(input: {
  project: {
    id: string;
    name: string;
  };
}): AcceptInviteResponse {
  return {
    accepted: true,
    project: input.project,
  };
}
