import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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
import type { CreateProjectInviteDto } from '../dto/create-project-invite.dto';
import {
  mapAcceptInviteResponse,
  mapCreateProjectInviteResponse,
  mapInvitePreviewResponse,
} from '../mapper/project-invites.mapper';
import type {
  AcceptInviteResponse,
  CreateProjectInviteResponse,
  InvitePreviewResponse,
} from '../types/project-invite-response.type';

const PROJECT_INVITE_TTL_MS = 1000 * 60 * 60 * 24 * 7;

@Injectable()
export class ProjectInvitesService {
  private readonly logger = new Logger(ProjectInvitesService.name);

  constructor(
    private readonly prismaService: PrismaService,
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
  ) {}

  async createInvite(
    currentUser: AuthUserResponse,
    projectId: string,
    createProjectInviteDto: CreateProjectInviteDto,
  ): Promise<CreateProjectInviteResponse> {
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
      getAppRuntimeConfig(this.configService).frontendUrl,
    );

    try {
      await this.mailService.sendMail({
        to: inviteeEmail,
        subject: `You were invited to ${project.name}`,
        text: `${currentUser.name} invited you to join ${project.name}. Open ${inviteLink.toString()} to continue.`,
        html: `<p>${escapeHtml(currentUser.name)} invited you to join ${escapeHtml(project.name)}.</p><p>Open the invite link: <a href="${inviteLink.toString()}">${inviteLink.toString()}</a>.</p>`,
      });
    } catch (error) {
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

    return mapCreateProjectInviteResponse({
      email: inviteeEmail,
      expiresAt,
    });
  }

  async previewInvite(token: string): Promise<InvitePreviewResponse> {
    const invite = await this.findActiveInviteByToken(token);

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

  async acceptInvite(
    token: string,
    currentUser: AuthUserResponse,
  ): Promise<AcceptInviteResponse> {
    if (!currentUser.emailVerifiedAt) {
      throw createForbiddenException({
        message: 'Email verification is required before accepting invites',
      });
    }

    const invite = await this.findActiveInviteByToken(token);

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

  private async findActiveInviteByToken(token: string) {
    const tokenHash = hashOpaqueToken(token);
    const invite = await this.prismaService.projectInvite.findUnique({
      where: {
        tokenHash,
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

    if (!invite || invite.acceptedAt || invite.expiresAt <= new Date()) {
      throw createNotFoundException({
        message: 'Invite not found or expired',
      });
    }

    return invite;
  }
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
