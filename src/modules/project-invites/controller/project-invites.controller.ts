import { Controller, Get, Param, Post, Body, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { RequireProjectAccess } from '../../auth/decorators/resource-access.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ResourceAccessGuard } from '../../auth/guards/resource-access.guard';
import type { AuthUserResponse } from '../../auth/types/auth-response.type';
import { CreateProjectInviteDto } from '../dto/create-project-invite.dto';
import { ProjectInvitesService } from '../service/project-invites.service';
import type {
  AcceptInviteResponse,
  CreateProjectInviteResponse,
  InvitePreviewResponse,
} from '../types/project-invite-response.type';

@Controller()
export class ProjectInvitesController {
  constructor(private readonly projectInvitesService: ProjectInvitesService) {}

  @Post('projects/:projectId/invites')
  @UseGuards(JwtAuthGuard, ResourceAccessGuard)
  @RequireProjectAccess({
    ownerOnly: true,
  })
  createInvite(
    @CurrentUser() currentUser: AuthUserResponse,
    @Param('projectId') projectId: string,
    @Body() createProjectInviteDto: CreateProjectInviteDto,
  ): Promise<CreateProjectInviteResponse> {
    return this.projectInvitesService.createInvite(
      currentUser,
      projectId,
      createProjectInviteDto,
    );
  }

  @Get('invites/:token')
  previewInvite(@Param('token') token: string): Promise<InvitePreviewResponse> {
    return this.projectInvitesService.previewInvite(token);
  }

  @Post('invites/:token/accept')
  @UseGuards(JwtAuthGuard)
  acceptInvite(
    @Param('token') token: string,
    @CurrentUser() currentUser: AuthUserResponse,
  ): Promise<AcceptInviteResponse> {
    return this.projectInvitesService.acceptInvite(token, currentUser);
  }
}
