import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { ProjectMemberRole } from '@prisma/client';
import {
  createConflictException,
  createForbiddenException,
  createNotFoundException,
} from '../../../common/utils/api-exception.util';
import {
  generateOpaqueToken,
  hashOpaqueToken,
} from '../../../common/utils/opaque-token.util';
import { getAppRuntimeConfig } from '../../../config/runtime-config';
import { PrismaService } from '../../../database/prisma.service';
import type { AuthUserResponse } from '../../auth/types/auth-response.type';
import { MailService } from '../../mail/service/mail.service';
import { buildProjectInviteEmailTemplate } from '../../mail/templates/project-invite-email.template';
import type { CreateProjectInviteDto } from '../dto/create-project-invite.dto';
import {
  mapAcceptInviteResponse,
  mapCreateProjectInviteResponse,
  mapInvitePreviewResponse,
  mapPendingProjectInvite,
  mapPendingProjectInvitesResponse,
} from '../mapper/project-invites.mapper';
import type {
  AcceptInviteResponse,
  CreateProjectInviteResponse,
  InvitePreviewResponse,
  PendingProjectInvitesResponse,
} from '../types/project-invite-response.type';

const PROJECT_INVITE_TTL_MS = 1000 * 60 * 60 * 24 * 7;
const PROJECT_INVITE_REVIEW_AUDIENCE = 'project-invite-review';

type ActiveProjectInviteRecord = {
  id: string;
  projectId: string;
  invitedById: string;
  email: string;
  role: ProjectMemberRole;
  tokenHash: string;
  expiresAt: Date;
  acceptedAt: Date | null;
  createdAt: Date;
  project: {
    id: string;
    name: string;
  };
  invitedBy: {
    id: string;
    name: string;
  };
};

type ProjectInviteReviewTokenPayload = {
  kind: 'project-invite-review';
  inviteId: string;
  email: string;
};

@Injectable()
export class ProjectInvitesService {
  private readonly logger = new Logger(ProjectInvitesService.name);

  constructor(
    private readonly prismaService: PrismaService,
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
  ) {}

  async createInvite(
    currentUser: AuthUserResponse,
    projectId: string,
    createProjectInviteDto: CreateProjectInviteDto,
  ): Promise<CreateProjectInviteResponse> {
    const appRuntimeConfig = getAppRuntimeConfig(this.configService);
    const project = await this.prismaService.project.findUnique({
      where: {
        id: projectId,
      },
      select: {
        id: true,
        name: true,
      },
    });

    if (!project) {
      throw createNotFoundException({
        message: 'Project not found',
      });
    }

    const inviteeEmail = createProjectInviteDto.email;
    const inviteRole = createProjectInviteDto.role ?? ProjectMemberRole.MEMBER;

    const existingMembership = await this.prismaService.projectMember.findFirst(
      {
        where: {
          projectId,
          user: {
            email: inviteeEmail,
          },
        },
        select: {
          id: true,
        },
      },
    );

    if (existingMembership) {
      throw createConflictException({
        message: 'This user is already a member of the project',
      });
    }

    const activeInvite = await this.prismaService.projectInvite.findFirst({
      where: {
        projectId,
        email: inviteeEmail,
        acceptedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
      select: {
        id: true,
      },
    });

    if (activeInvite) {
      throw createConflictException({
        message: 'An active invite already exists for this email',
      });
    }

    // Store only the hash so leaked database rows cannot be turned back into a
    // usable invite link.
    const rawToken = generateOpaqueToken();
    const tokenHash = hashOpaqueToken(rawToken);
    const expiresAt = new Date(Date.now() + PROJECT_INVITE_TTL_MS);

    const createdInvite = await this.prismaService.projectInvite.create({
      data: {
        projectId,
        invitedById: currentUser.id,
        email: inviteeEmail,
        role: inviteRole,
        tokenHash,
        expiresAt,
      },
    });

    const inviteLink = new URL(
      `/invite/${rawToken}`,
      appRuntimeConfig.frontendUrl,
    );

    if (appRuntimeConfig.inviteDeliveryMode === 'email') {
      const projectInviteEmail = buildProjectInviteEmailTemplate({
        inviterName: currentUser.name,
        inviteeEmail,
        projectName: project.name,
        inviteUrl: inviteLink.toString(),
        frontendUrl: appRuntimeConfig.frontendUrl,
        role: inviteRole,
      });

      try {
        await this.mailService.sendMail({
          to: inviteeEmail,
          ...projectInviteEmail,
        });
      } catch (error) {
        // Roll back the invite row so the project does not accumulate "sent" invites
        // that nobody can actually receive.
        await this.prismaService.projectInvite
          .delete({
            where: {
              id: createdInvite.id,
            },
          })
          .catch((cleanupError: unknown) => {
            this.logger.error(
              `Failed to roll back invite ${createdInvite.id} after mail send error.`,
              cleanupError instanceof Error ? cleanupError.stack : undefined,
            );
          });

        throw error;
      }
    }

    return mapCreateProjectInviteResponse({
      email: inviteeEmail,
      expiresAt,
      deliveryMode: appRuntimeConfig.inviteDeliveryMode,
      inviteUrl:
        appRuntimeConfig.inviteDeliveryMode === 'link'
          ? inviteLink.toString()
          : null,
    });
  }

  async previewInvite(token: string): Promise<InvitePreviewResponse> {
    const invite = await this.resolveActiveInviteByToken(token);

    return mapInvitePreviewResponse({
      project: {
        id: invite.project.id,
        name: invite.project.name,
      },
      email: invite.email,
      role: invite.role,
      expiresAt: invite.expiresAt,
      invitedBy: {
        id: invite.invitedBy.id,
        name: invite.invitedBy.name,
      },
    });
  }

  async listPendingInvites(
    currentUser: AuthUserResponse,
  ): Promise<PendingProjectInvitesResponse> {
    const invites = await this.prismaService.projectInvite.findMany({
      where: {
        email: currentUser.email,
        acceptedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
          },
        },
        invitedBy: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    const items = await Promise.all(
      invites.map(async (invite) =>
        mapPendingProjectInvite({
          token: await this.createPendingInviteReviewToken(invite),
          createdAt: invite.createdAt,
          project: invite.project,
          role: invite.role,
          expiresAt: invite.expiresAt,
          invitedBy: invite.invitedBy,
        }),
      ),
    );

    return mapPendingProjectInvitesResponse({
      items,
    });
  }

  async acceptInvite(
    token: string,
    currentUser: AuthUserResponse,
  ): Promise<AcceptInviteResponse> {
    if (
      getAppRuntimeConfig(this.configService).emailVerificationMode ===
        'required' &&
      !currentUser.emailVerifiedAt
    ) {
      throw createForbiddenException({
        message: 'Email verification is required before accepting invites',
      });
    }

    const invite = await this.resolveActiveInviteByToken(token);

    if (invite.email !== currentUser.email) {
      throw createForbiddenException({
        message: 'This invite does not match the current account',
      });
    }

    const existingMembership =
      await this.prismaService.projectMember.findUnique({
        where: {
          projectId_userId: {
            projectId: invite.projectId,
            userId: currentUser.id,
          },
        },
        select: {
          id: true,
        },
      });

    if (existingMembership) {
      throw createConflictException({
        message: 'You are already a member of this project',
      });
    }

    // Accepting the invite is a membership change plus a token state change, so keep
    // them in one transaction to avoid partially-consumed invites.
    await this.prismaService.$transaction([
      this.prismaService.projectMember.create({
        data: {
          projectId: invite.projectId,
          userId: currentUser.id,
          role: invite.role,
        },
      }),
      this.prismaService.projectInvite.update({
        where: {
          id: invite.id,
        },
        data: {
          acceptedAt: new Date(),
        },
      }),
    ]);

    return mapAcceptInviteResponse({
      project: {
        id: invite.project.id,
        name: invite.project.name,
      },
    });
  }

  private async createPendingInviteReviewToken(
    invite: Pick<ActiveProjectInviteRecord, 'email' | 'expiresAt' | 'id'>,
  ) {
    const appRuntimeConfig = getAppRuntimeConfig(this.configService);
    const expiresInSeconds = Math.max(
      1,
      Math.ceil((invite.expiresAt.getTime() - Date.now()) / 1000),
    );

    return this.jwtService.signAsync(
      {
        kind: 'project-invite-review',
        inviteId: invite.id,
        email: invite.email,
      } satisfies ProjectInviteReviewTokenPayload,
      {
        audience: PROJECT_INVITE_REVIEW_AUDIENCE,
        expiresIn: expiresInSeconds,
        secret: appRuntimeConfig.jwtAccessSecret,
      },
    );
  }

  private async resolveActiveInviteByToken(token: string) {
    const opaqueInvite = await this.findActiveInviteByOpaqueToken(token);

    if (opaqueInvite) {
      return opaqueInvite;
    }

    const reviewInvite = await this.findActiveInviteByReviewToken(token);

    if (reviewInvite) {
      return reviewInvite;
    }

    throw createNotFoundException({
      message: 'Invite not found or expired',
    });
  }

  private async findActiveInviteByOpaqueToken(token: string) {
    const tokenHash = hashOpaqueToken(token);
    const invite = await this.prismaService.projectInvite.findUnique({
      where: {
        tokenHash,
      },
      include: ACTIVE_PROJECT_INVITE_INCLUDE,
    });

    return this.ensureInviteIsActive(invite);
  }

  private async findActiveInviteByReviewToken(token: string) {
    const appRuntimeConfig = getAppRuntimeConfig(this.configService);
    let payload: ProjectInviteReviewTokenPayload;

    try {
      payload =
        await this.jwtService.verifyAsync<ProjectInviteReviewTokenPayload>(
          token,
          {
            audience: PROJECT_INVITE_REVIEW_AUDIENCE,
            secret: appRuntimeConfig.jwtAccessSecret,
          },
        );
    } catch {
      return null;
    }

    if (
      payload.kind !== 'project-invite-review' ||
      !payload.inviteId ||
      !payload.email
    ) {
      return null;
    }

    const invite = await this.prismaService.projectInvite.findUnique({
      where: {
        id: payload.inviteId,
      },
      include: ACTIVE_PROJECT_INVITE_INCLUDE,
    });

    const activeInvite = this.ensureInviteIsActive(invite);

    if (!activeInvite || activeInvite.email !== payload.email) {
      return null;
    }

    return activeInvite;
  }

  private ensureInviteIsActive(
    invite: ActiveProjectInviteRecord | null,
  ): ActiveProjectInviteRecord | null {
    if (!invite || invite.acceptedAt || invite.expiresAt <= new Date()) {
      return null;
    }

    return invite;
  }
}

const ACTIVE_PROJECT_INVITE_INCLUDE = {
  project: {
    select: {
      id: true,
      name: true,
    },
  },
  invitedBy: {
    select: {
      id: true,
      name: true,
    },
  },
} as const;
