import { ProjectMemberRole } from '@prisma/client';

export type CreateProjectInviteResponse = {
  message: string;
  email: string;
  expiresAt: string;
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

export type AcceptInviteResponse = {
  accepted: true;
  project: {
    id: string;
    name: string;
  };
};
