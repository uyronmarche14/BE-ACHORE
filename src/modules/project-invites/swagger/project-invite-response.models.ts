import { ProjectMemberRole } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';

export class SwaggerCreateProjectInviteResponseDto {
  @ApiProperty({
    example: 'Invite link ready',
  })
  message!: string;

  @ApiProperty({
    example: 'jane@example.com',
  })
  email!: string;

  @ApiProperty({
    example: '2026-04-10T09:15:23.000Z',
    format: 'date-time',
  })
  expiresAt!: string;

  @ApiProperty({
    enum: ['email', 'link'],
    example: 'link',
  })
  deliveryMode!: 'email' | 'link';

  @ApiProperty({
    nullable: true,
    example: 'https://archon.example.com/invite/raw-token',
  })
  inviteUrl!: string | null;
}

export class SwaggerInviteProjectDto {
  @ApiProperty({
    example: 'proj_7b0be4ef-8eb6-4db1-a442-c534a53e7cf1',
  })
  id!: string;

  @ApiProperty({
    example: 'Launch Website',
  })
  name!: string;
}

export class SwaggerInviteUserDto {
  @ApiProperty({
    example: 'user_2bdb3b8d-8a3d-4354-b18f-9497b9a6ec82',
  })
  id!: string;

  @ApiProperty({
    example: 'Jane Doe',
  })
  name!: string;
}

export class SwaggerInvitePreviewResponseDto {
  @ApiProperty({
    type: () => SwaggerInviteProjectDto,
  })
  project!: SwaggerInviteProjectDto;

  @ApiProperty({
    example: 'jane@example.com',
  })
  email!: string;

  @ApiProperty({
    enum: ProjectMemberRole,
    example: ProjectMemberRole.MEMBER,
  })
  role!: ProjectMemberRole;

  @ApiProperty({
    example: '2026-04-10T09:15:23.000Z',
    format: 'date-time',
  })
  expiresAt!: string;

  @ApiProperty({
    type: () => SwaggerInviteUserDto,
  })
  invitedBy!: SwaggerInviteUserDto;
}

export class SwaggerAcceptInviteResponseDto {
  @ApiProperty({
    enum: [true],
    example: true,
  })
  accepted!: true;

  @ApiProperty({
    type: () => SwaggerInviteProjectDto,
  })
  project!: SwaggerInviteProjectDto;
}

export class SwaggerPendingProjectInviteDto {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.pending-invite.review-token',
  })
  token!: string;

  @ApiProperty({
    example: '2026-04-06T09:15:23.000Z',
    format: 'date-time',
  })
  createdAt!: string;

  @ApiProperty({
    type: () => SwaggerInviteProjectDto,
  })
  project!: SwaggerInviteProjectDto;

  @ApiProperty({
    enum: ProjectMemberRole,
    example: ProjectMemberRole.MEMBER,
  })
  role!: ProjectMemberRole;

  @ApiProperty({
    example: '2026-04-10T09:15:23.000Z',
    format: 'date-time',
  })
  expiresAt!: string;

  @ApiProperty({
    type: () => SwaggerInviteUserDto,
  })
  invitedBy!: SwaggerInviteUserDto;
}

export class SwaggerPendingProjectInvitesResponseDto {
  @ApiProperty({
    type: () => SwaggerPendingProjectInviteDto,
    isArray: true,
  })
  items!: SwaggerPendingProjectInviteDto[];
}
