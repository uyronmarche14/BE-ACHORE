import { ProjectMemberRole } from '@prisma/client';

export type CreateProjectInviteResponse = {
  message: string;
  email: string;
  expiresAt: string;
  deliveryMode: 'email' | 'link';
  inviteUrl: string | null;
};

export type InvitePreviewResponse = {
  project: {
    id: string;
    name: string;
  };
  email: string;
  role: ProjectMemberRole;
  expiresAt: string;
  invitedBy: {
    id: string;
    name: string;
  };
};

export type PendingProjectInvite = {
  token: string;
  createdAt: string;
  project: {
    id: string;
    name: string;
  };
  role: ProjectMemberRole;
  expiresAt: string;
  invitedBy: {
    id: string;
    name: string;
  };
};

export type PendingProjectInvitesResponse = {
  items: PendingProjectInvite[];
};

export type AcceptInviteResponse = {
  accepted: true;
  project: {
    id: string;
    name: string;
  };
};
