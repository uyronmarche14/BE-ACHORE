import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiEnvelopedResponse } from '../../../common/swagger/decorators/api-enveloped-response.decorator';
import {
  ApiInviteTokenParam,
  ApiProjectIdParam,
} from '../../../common/swagger/decorators/api-parameter.decorators';
import { ApiStandardErrorResponses } from '../../../common/swagger/decorators/api-standard-error-responses.decorator';
import { SWAGGER_BEARER_AUTH_NAME } from '../../../common/swagger/swagger.constants';
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
  PendingProjectInvitesResponse,
} from '../types/project-invite-response.type';
import {
  SwaggerAcceptInviteResponseDto,
  SwaggerCreateProjectInviteResponseDto,
  SwaggerInvitePreviewResponseDto,
  SwaggerPendingProjectInvitesResponseDto,
} from '../swagger/project-invite-response.models';

@ApiTags('Project Invites')
@Controller()
export class ProjectInvitesController {
  constructor(private readonly projectInvitesService: ProjectInvitesService) {}

  @Post('projects/:projectId/invites')
  @UseGuards(JwtAuthGuard, ResourceAccessGuard)
  @RequireProjectAccess({
    ownerOnly: true,
  })
  @ApiOperation({
    summary: 'Create a project invite and deliver it by email or direct link.',
  })
  @ApiBearerAuth(SWAGGER_BEARER_AUTH_NAME)
  @ApiProjectIdParam()
  @ApiEnvelopedResponse({
    status: 201,
    description: 'Invite created successfully.',
    type: SwaggerCreateProjectInviteResponseDto,
  })
  @ApiStandardErrorResponses([400, 401, 403, 404, 409])
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

  @Get('invites/pending/items')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'List active project invites for the current authenticated user.',
  })
  @ApiBearerAuth(SWAGGER_BEARER_AUTH_NAME)
  @ApiEnvelopedResponse({
    description: 'Pending invites loaded successfully.',
    type: SwaggerPendingProjectInvitesResponseDto,
  })
  @ApiStandardErrorResponses([401])
  listPendingInvites(
    @CurrentUser() currentUser: AuthUserResponse,
  ): Promise<PendingProjectInvitesResponse> {
    return this.projectInvitesService.listPendingInvites(currentUser);
  }

  @Get('invites/:token')
  @ApiOperation({
    summary: 'Preview an invite before accepting it.',
  })
  @ApiInviteTokenParam()
  @ApiEnvelopedResponse({
    description: 'Invite preview loaded successfully.',
    type: SwaggerInvitePreviewResponseDto,
  })
  @ApiStandardErrorResponses([404])
  previewInvite(@Param('token') token: string): Promise<InvitePreviewResponse> {
    return this.projectInvitesService.previewInvite(token);
  }

  @Post('invites/:token/accept')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Accept an invite for the current authenticated user.',
  })
  @ApiInviteTokenParam()
  @ApiBearerAuth(SWAGGER_BEARER_AUTH_NAME)
  @ApiEnvelopedResponse({
    status: 201,
    description: 'Invite accepted successfully.',
    type: SwaggerAcceptInviteResponseDto,
  })
  @ApiStandardErrorResponses([401, 403, 404, 409])
  acceptInvite(
    @Param('token') token: string,
    @CurrentUser() currentUser: AuthUserResponse,
  ): Promise<AcceptInviteResponse> {
    return this.projectInvitesService.acceptInvite(token, currentUser);
  }
}
