import { ProjectMemberRole } from '@prisma/client';
import { renderTransactionalEmail } from './transactional-email.template';

type BuildProjectInviteEmailTemplateParams = {
  inviterName: string;
  inviteeEmail: string;
  projectName: string;
  inviteUrl: string;
  frontendUrl: string;
  role: ProjectMemberRole;
};

export function buildProjectInviteEmailTemplate({
  inviterName,
  inviteeEmail,
  projectName,
  inviteUrl,
  frontendUrl,
  role,
}: BuildProjectInviteEmailTemplateParams) {
  const readableRole = humanizeRole(role);

  return renderTransactionalEmail({
    subject: `You were invited to ${projectName}`,
    preheader: `${inviterName} invited you to join ${projectName} on Archon.`,
    eyebrow: 'Project invitation',
    title: `Join ${projectName} on Archon`,
    intro:
      'Review the invite details below, then open your workspace invite when you are ready to continue.',
    bodyParagraphs: [
      `${inviterName} invited you to collaborate on ${projectName} as a ${readableRole}.`,
      `This invite was sent to ${inviteeEmail}. Open it from the button below to accept the project membership.`,
    ],
    ctaLabel: 'Open invite',
    ctaUrl: inviteUrl,
    footer:
      'If this invite was not expected, you can ignore this email and no project access will be granted.',
    note: 'Archon project invites stay tied to the frontend workspace URL configured for the current environment.',
    brandUrl: frontendUrl,
    calloutTitle: 'Invite details',
    calloutItems: [
      {
        label: 'Project',
        value: projectName,
      },
      {
        label: 'Role',
        value: readableRole,
      },
      {
        label: 'Invited by',
        value: inviterName,
      },
    ],
  });
}

function humanizeRole(role: ProjectMemberRole) {
  return role.charAt(0) + role.slice(1).toLowerCase();
}
