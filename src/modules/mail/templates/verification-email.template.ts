import { renderTransactionalEmail } from './transactional-email.template';

type BuildVerificationEmailTemplateParams = {
  recipientName: string;
  verificationUrl: string;
  frontendUrl: string;
};

export function buildVerificationEmailTemplate({
  recipientName,
  verificationUrl,
  frontendUrl,
}: BuildVerificationEmailTemplateParams) {
  return renderTransactionalEmail({
    subject: 'Verify your Archon account',
    preheader: 'Verify your email to activate your Archon workspace.',
    eyebrow: 'Email verification',
    title: 'Please verify your email',
    intro:
      'Confirm your inbox to activate your Archon account and keep your workspace secure.',
    bodyParagraphs: [
      `Hi ${recipientName},`,
      'Use the button below to verify your email and continue into your project workspace.',
    ],
    ctaLabel: 'Verify my account',
    ctaUrl: verificationUrl,
    footer:
      'If you did not create an Archon account, you can safely ignore this email.',
    note: 'Archon keeps projects, invites, and task history aligned from the first click.',
    brandUrl: frontendUrl,
    calloutTitle: 'What happens next',
    calloutItems: [
      {
        label: 'Workspace access',
        value:
          'Your email will be marked as verified and the signup flow can finish cleanly.',
      },
      {
        label: 'Verification link',
        value:
          'This secure link was generated from the frontend URL configured for this environment.',
      },
    ],
  });
}
