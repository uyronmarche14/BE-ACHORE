/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { ProjectMemberRole } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { MailService } from '../../mail/service/mail.service';
import type { AuthUserResponse } from '../../auth/types/auth-response.type';
import { ProjectInvitesService } from './project-invites.service';

describe('ProjectInvitesService', () => {
  let optionalConfigValues: Record<
    string,
    boolean | number | string | undefined
  >;

  const currentUser: AuthUserResponse = {
    id: 'user-1',
    name: 'Jane Doe',
    email: 'jane@example.com',
    role: 'ADMIN',
    emailVerifiedAt: '2026-04-01T00:00:00.000Z',
  };

  const mockConfigService = {
    getOrThrow: jest.fn((key: string) => {
      const config: Record<string, string | number | boolean> = {
        PORT: 4000,
        APP_URL: 'http://localhost:4000',
        FRONTEND_URL: 'http://localhost:3000',
        JWT_ACCESS_SECRET: 'test-access-secret-12345',
        JWT_REFRESH_SECRET: 'test-refresh-secret-12345',
        JWT_ACCESS_TTL: '15m',
        JWT_REFRESH_TTL: '7d',
        REFRESH_COOKIE_NAME: 'archon_refresh_token',
        NODE_ENV: 'test',
      };

      return config[key];
    }),
    get: jest.fn((key: string) => optionalConfigValues[key]),
  } as unknown as ConfigService;

  const sendMailMock = jest.fn();
  const signAsyncMock = jest.fn();
  const verifyAsyncMock = jest.fn();

  const mockMailService = {
    sendMail: sendMailMock,
  } as unknown as jest.Mocked<MailService>;

  const mockJwtService = {
    signAsync: signAsyncMock,
    verifyAsync: verifyAsyncMock,
  } as unknown as jest.Mocked<JwtService>;

  const mockPrismaService = {
    project: {
      findUnique: jest.fn(),
    },
    projectMember: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    projectInvite: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  } as unknown as PrismaService & {
    project: {
      findUnique: jest.Mock;
    };
    projectMember: {
      findFirst: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
    };
    projectInvite: {
      findFirst: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock;
      delete: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
    };
    $transaction: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    optionalConfigValues = {
      EMAIL_VERIFICATION_MODE: 'required',
      INVITE_DELIVERY_MODE: 'email',
      REFRESH_COOKIE_SECURE: false,
      TRUST_PROXY_HOPS: 0,
    };

    mockPrismaService.project.findUnique.mockResolvedValue({
      id: 'project-1',
      name: 'Launch Board',
    });
    mockPrismaService.projectMember.findFirst.mockResolvedValue(null);
    mockPrismaService.projectMember.findUnique.mockResolvedValue(null);
    mockPrismaService.projectMember.create.mockResolvedValue(undefined);
    mockPrismaService.projectInvite.findFirst.mockResolvedValue(null);
    mockPrismaService.projectInvite.findMany.mockResolvedValue([]);
    mockPrismaService.projectInvite.create.mockResolvedValue({
      id: 'invite-1',
    });
    mockPrismaService.projectInvite.delete.mockResolvedValue(undefined);
    mockPrismaService.projectInvite.update.mockResolvedValue(undefined);
    mockPrismaService.projectInvite.findUnique.mockResolvedValue({
      id: 'invite-1',
      projectId: 'project-1',
      invitedById: 'user-1',
      email: 'alex@example.com',
      role: ProjectMemberRole.MEMBER,
      tokenHash: 'hashed-token',
      expiresAt: new Date('2026-04-13T00:00:00.000Z'),
      acceptedAt: null,
      createdAt: new Date('2026-04-06T00:00:00.000Z'),
      project: {
        id: 'project-1',
        name: 'Launch Board',
      },
      invitedBy: {
        id: 'user-1',
        name: 'Jane Doe',
      },
    });
    mockPrismaService.$transaction.mockImplementation(
      (
        input:
          | Promise<unknown>[]
          | ((client: typeof mockPrismaService) => Promise<unknown>),
      ) =>
        Array.isArray(input) ? Promise.all(input) : input(mockPrismaService),
    );
    sendMailMock.mockResolvedValue(undefined);
    signAsyncMock.mockResolvedValue('signed-review-token');
    verifyAsyncMock.mockResolvedValue({
      kind: 'project-invite-review',
      inviteId: 'invite-1',
      email: 'alex@example.com',
    });
  });

  it('sends email invites when delivery mode is email', async () => {
    const service = createService();

    const result = await service.createInvite(currentUser, 'project-1', {
      email: 'alex@example.com',
    });

    expect(sendMailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'alex@example.com',
        subject: 'You were invited to Launch Board',
      }),
    );
    expect(result).toEqual({
      message: 'Invite sent successfully',
      email: 'alex@example.com',
      expiresAt: expect.any(String),
      deliveryMode: 'email',
      inviteUrl: null,
    });
  });

  it('returns a shareable invite link without sending mail in link mode', async () => {
    optionalConfigValues.INVITE_DELIVERY_MODE = 'link';
    const service = createService();

    const result = await service.createInvite(currentUser, 'project-1', {
      email: 'alex@example.com',
    });

    expect(sendMailMock).not.toHaveBeenCalled();
    expect(mockPrismaService.projectInvite.delete).not.toHaveBeenCalled();
    expect(result).toEqual({
      message: 'Invite link created successfully',
      email: 'alex@example.com',
      expiresAt: expect.any(String),
      deliveryMode: 'link',
      inviteUrl: expect.stringMatching(/^http:\/\/localhost:3000\/invite\//),
    });
  });

  it('allows invite acceptance for unverified users when verification bypass is enabled', async () => {
    optionalConfigValues.EMAIL_VERIFICATION_MODE = 'bypass';
    const service = createService();

    const result = await service.acceptInvite('invite-token', {
      ...currentUser,
      email: 'alex@example.com',
      emailVerifiedAt: null,
    });

    expect(mockPrismaService.projectMember.create).toHaveBeenCalledWith({
      data: {
        projectId: 'project-1',
        userId: 'user-1',
        role: ProjectMemberRole.MEMBER,
      },
    });
    expect(result).toEqual({
      accepted: true,
      project: {
        id: 'project-1',
        name: 'Launch Board',
      },
    });
  });

  it('returns pending invites that match the current user email', async () => {
    const service = createService();

    mockPrismaService.projectInvite.findMany.mockResolvedValue([
      {
        id: 'invite-2',
        projectId: 'project-2',
        invitedById: 'user-1',
        email: 'alex@example.com',
        role: ProjectMemberRole.OWNER,
        tokenHash: 'hashed-token-2',
        expiresAt: new Date('2026-04-14T00:00:00.000Z'),
        acceptedAt: null,
        createdAt: new Date('2026-04-07T00:00:00.000Z'),
        project: {
          id: 'project-2',
          name: 'Release Planning',
        },
        invitedBy: {
          id: 'user-1',
          name: 'Jane Doe',
        },
      },
      {
        id: 'invite-1',
        projectId: 'project-1',
        invitedById: 'user-1',
        email: 'alex@example.com',
        role: ProjectMemberRole.MEMBER,
        tokenHash: 'hashed-token-1',
        expiresAt: new Date('2026-04-13T00:00:00.000Z'),
        acceptedAt: null,
        createdAt: new Date('2026-04-06T00:00:00.000Z'),
        project: {
          id: 'project-1',
          name: 'Launch Board',
        },
        invitedBy: {
          id: 'user-1',
          name: 'Jane Doe',
        },
      },
    ]);
    signAsyncMock
      .mockResolvedValueOnce('signed-review-token-2')
      .mockResolvedValueOnce('signed-review-token-1');

    const result = await service.listPendingInvites({
      ...currentUser,
      email: 'alex@example.com',
    });

    expect(mockPrismaService.projectInvite.findMany).toHaveBeenCalledWith({
      where: {
        email: 'alex@example.com',
        acceptedAt: null,
        expiresAt: {
          gt: expect.any(Date),
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
    expect(result).toEqual({
      items: [
        {
          token: 'signed-review-token-2',
          createdAt: '2026-04-07T00:00:00.000Z',
          project: {
            id: 'project-2',
            name: 'Release Planning',
          },
          role: ProjectMemberRole.OWNER,
          expiresAt: '2026-04-14T00:00:00.000Z',
          invitedBy: {
            id: 'user-1',
            name: 'Jane Doe',
          },
        },
        {
          token: 'signed-review-token-1',
          createdAt: '2026-04-06T00:00:00.000Z',
          project: {
            id: 'project-1',
            name: 'Launch Board',
          },
          role: ProjectMemberRole.MEMBER,
          expiresAt: '2026-04-13T00:00:00.000Z',
          invitedBy: {
            id: 'user-1',
            name: 'Jane Doe',
          },
        },
      ],
    });
  });

  it('previews invites through the signed pending-review token path', async () => {
    const service = createService();

    mockPrismaService.projectInvite.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 'invite-1',
        projectId: 'project-1',
        invitedById: 'user-1',
        email: 'alex@example.com',
        role: ProjectMemberRole.MEMBER,
        tokenHash: 'hashed-token',
        expiresAt: new Date('2026-04-13T00:00:00.000Z'),
        acceptedAt: null,
        createdAt: new Date('2026-04-06T00:00:00.000Z'),
        project: {
          id: 'project-1',
          name: 'Launch Board',
        },
        invitedBy: {
          id: 'user-1',
          name: 'Jane Doe',
        },
      });

    const result = await service.previewInvite('signed-review-token');

    expect(verifyAsyncMock).toHaveBeenCalledWith('signed-review-token', {
      audience: 'project-invite-review',
      secret: 'test-access-secret-12345',
    });
    expect(result).toEqual({
      project: {
        id: 'project-1',
        name: 'Launch Board',
      },
      email: 'alex@example.com',
      role: ProjectMemberRole.MEMBER,
      expiresAt: '2026-04-13T00:00:00.000Z',
      invitedBy: {
        id: 'user-1',
        name: 'Jane Doe',
      },
    });
  });

  it('accepts invites through the signed pending-review token path', async () => {
    optionalConfigValues.EMAIL_VERIFICATION_MODE = 'bypass';
    const service = createService();

    mockPrismaService.projectInvite.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 'invite-1',
        projectId: 'project-1',
        invitedById: 'user-1',
        email: 'alex@example.com',
        role: ProjectMemberRole.MEMBER,
        tokenHash: 'hashed-token',
        expiresAt: new Date('2026-04-13T00:00:00.000Z'),
        acceptedAt: null,
        createdAt: new Date('2026-04-06T00:00:00.000Z'),
        project: {
          id: 'project-1',
          name: 'Launch Board',
        },
        invitedBy: {
          id: 'user-1',
          name: 'Jane Doe',
        },
      });

    const result = await service.acceptInvite('signed-review-token', {
      ...currentUser,
      email: 'alex@example.com',
      emailVerifiedAt: null,
    });

    expect(result).toEqual({
      accepted: true,
      project: {
        id: 'project-1',
        name: 'Launch Board',
      },
    });
  });

  function createService() {
    return new ProjectInvitesService(
      mockPrismaService,
      mockMailService,
      mockConfigService,
      mockJwtService,
    );
  }
});
