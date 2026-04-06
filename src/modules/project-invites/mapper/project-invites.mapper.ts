import type {
  AcceptInviteResponse,
  CreateProjectInviteResponse,
  InvitePreviewResponse,
  PendingProjectInvite,
  PendingProjectInvitesResponse,
} from '../types/project-invite-response.type';

export function mapCreateProjectInviteResponse(input: {
  email: string;
  expiresAt: Date;
  deliveryMode: 'email' | 'link';
  inviteUrl: string | null;
}): CreateProjectInviteResponse {
  return {
    message:
      input.deliveryMode === 'email'
        ? 'Invite sent successfully'
        : 'Invite link created successfully',
    email: input.email,
    expiresAt: input.expiresAt.toISOString(),
    deliveryMode: input.deliveryMode,
    inviteUrl: input.inviteUrl,
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

export function mapPendingProjectInvite(input: {
  token: string;
  createdAt: Date;
  project: {
    id: string;
    name: string;
  };
  role: 'OWNER' | 'MEMBER';
  expiresAt: Date;
  invitedBy: {
    id: string;
    name: string;
  };
}): PendingProjectInvite {
  return {
    token: input.token,
    createdAt: input.createdAt.toISOString(),
    project: input.project,
    role: input.role,
    expiresAt: input.expiresAt.toISOString(),
    invitedBy: input.invitedBy,
  };
}

export function mapPendingProjectInvitesResponse(input: {
  items: PendingProjectInvite[];
}): PendingProjectInvitesResponse {
  return {
    items: input.items,
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
