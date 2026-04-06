import { ProjectMemberRole } from '@prisma/client';
import { buildProjectInviteEmailTemplate } from './project-invite-email.template';
import { buildVerificationEmailTemplate } from './verification-email.template';

describe('transactional email templates', () => {
  it('renders the verification email with the env-driven frontend link', () => {
    const email = buildVerificationEmailTemplate({
      recipientName: 'Jane Doe',
      verificationUrl:
        'http://localhost:3000/verify-email?token=verify-token&next=%2Fapp%2Fprojects%2Fproject-1',
      frontendUrl: 'http://localhost:3000',
    });

    expect(email.subject).toBe('Verify your Archon account');
    expect(email.text).toContain(
      'Verify my account: http://localhost:3000/verify-email?token=verify-token&next=%2Fapp%2Fprojects%2Fproject-1',
    );
    expect(email.text).toContain('Archon: http://localhost:3000');
    expect(email.html).toContain('Please verify your email');
    expect(email.html).toContain('href="http://localhost:3000"');
    expect(email.html).toContain(
      'href="http://localhost:3000/verify-email?token=verify-token&amp;next=%2Fapp%2Fprojects%2Fproject-1"',
    );
  });

  it('renders the project invite email with project context and role', () => {
    const email = buildProjectInviteEmailTemplate({
      inviterName: 'Jane Doe',
      inviteeEmail: 'alex@example.com',
      projectName: 'Launch readiness board',
      inviteUrl: 'http://localhost:3000/invite/raw-token',
      frontendUrl: 'http://localhost:3000',
      role: ProjectMemberRole.MEMBER,
    });

    expect(email.subject).toBe('You were invited to Launch readiness board');
    expect(email.text).toContain(
      'Open invite: http://localhost:3000/invite/raw-token',
    );
    expect(email.text).toContain('- Role: Member');
    expect(email.html).toContain('Join Launch readiness board on Archon');
    expect(email.html).toContain('alex@example.com');
    expect(email.html).toContain('Jane Doe');
    expect(email.html).toContain('Member');
    expect(email.html).toContain(
      'href="http://localhost:3000/invite/raw-token"',
    );
  });
});
