import { InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport } from 'nodemailer';
import { MailService } from './mail.service';

const mockSmtpSendMail = jest.fn();
const mockCreateTransport = createTransport as unknown as jest.Mock;
const mockResendSend = jest.fn();
const mockResendConstructor = jest.fn();

jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({
    sendMail: mockSmtpSendMail,
  })),
}));

jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation((...args: unknown[]) => {
    mockResendConstructor(...args);

    return {
      emails: {
        send: mockResendSend,
      },
    };
  }),
}));

describe('MailService', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockSmtpSendMail.mockResolvedValue(undefined);
    mockResendSend.mockResolvedValue({
      data: {
        id: 'email_123',
      },
      error: null,
      headers: null,
    });
  });

  it('uses SMTP by default for local-compatible delivery', async () => {
    const service = createMailService({
      SMTP_HOST: 'smtp.example.test',
      SMTP_PORT: 587,
      SMTP_USER: 'smtp-user',
      SMTP_PASS: 'smtp-pass',
      SMTP_FROM: 'noreply@example.test',
      SMTP_CONNECTION_TIMEOUT_MS: 3000,
    });

    await service.sendMail({
      to: 'jane@example.com',
      subject: 'Verify your account',
      text: 'it works',
      html: '<p>it works</p>',
    });

    expect(mockCreateTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        host: 'smtp.example.test',
        port: 587,
        connectionTimeout: 3000,
      }),
    );
    expect(mockSmtpSendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        from: 'noreply@example.test',
        to: 'jane@example.com',
        subject: 'Verify your account',
      }),
    );
    expect(mockResendConstructor).not.toHaveBeenCalled();
  });

  it('uses Resend when MAIL_PROVIDER=resend', async () => {
    const service = createMailService({
      MAIL_PROVIDER: 'resend',
      MAIL_FROM: 'Archon <noreply@mail.archon.example>',
      RESEND_API_KEY: 're_test_key',
    });

    await service.sendMail({
      to: 'jane@example.com',
      subject: 'Verify your account',
      text: 'it works',
      html: '<p>it works</p>',
    });

    expect(mockResendConstructor).toHaveBeenCalledWith('re_test_key');
    expect(mockResendSend).toHaveBeenCalledWith(
      expect.objectContaining({
        from: 'Archon <noreply@mail.archon.example>',
        to: 'jane@example.com',
        subject: 'Verify your account',
      }),
    );
    expect(mockCreateTransport).not.toHaveBeenCalled();
  });

  it('falls back to SMTP_FROM when Resend uses the shared sender config', async () => {
    const service = createMailService({
      MAIL_PROVIDER: 'resend',
      RESEND_API_KEY: 're_test_key',
      SMTP_FROM: 'noreply@example.test',
    });

    await service.sendMail({
      to: 'jane@example.com',
      subject: 'Verify your account',
      text: 'it works',
      html: '<p>it works</p>',
    });

    expect(mockResendSend).toHaveBeenCalledWith(
      expect.objectContaining({
        from: 'noreply@example.test',
      }),
    );
  });

  it('surfaces a provider-safe internal error when Resend rejects the send', async () => {
    const service = createMailService({
      MAIL_PROVIDER: 'resend',
      MAIL_FROM: 'Archon <noreply@mail.archon.example>',
      RESEND_API_KEY: 're_test_key',
    });
    mockResendSend.mockResolvedValue({
      data: null,
      error: {
        name: 'invalid_from_address',
        message: 'from address is invalid',
        statusCode: 422,
      },
      headers: null,
    });

    await expect(
      service.sendMail({
        to: 'jane@example.com',
        subject: 'Verify your account',
        text: 'it works',
        html: '<p>it works</p>',
      }),
    ).rejects.toBeInstanceOf(InternalServerErrorException);
  });

  it('falls back to SMTP outside production when Resend rejects an unverified sender domain', async () => {
    const service = createMailService({
      MAIL_PROVIDER: 'resend',
      MAIL_FROM: 'rhyssronmarche@gmail.com',
      RESEND_API_KEY: 're_test_key',
      SMTP_HOST: 'smtp.example.test',
      SMTP_PORT: 587,
      SMTP_USER: 'smtp-user',
      SMTP_PASS: 'smtp-pass',
      SMTP_FROM: 'rhyssronmarche@gmail.com',
      NODE_ENV: 'development',
    });
    mockResendSend.mockResolvedValue({
      data: null,
      error: {
        name: 'validation_error',
        message: 'The gmail.com domain is not verified.',
        statusCode: 422,
      },
      headers: null,
    });

    await service.sendMail({
      to: 'jane@example.com',
      subject: 'Verify your account',
      text: 'it works',
      html: '<p>it works</p>',
    });

    expect(mockResendConstructor).toHaveBeenCalledWith('re_test_key');
    expect(mockSmtpSendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        from: 'rhyssronmarche@gmail.com',
        to: 'jane@example.com',
      }),
    );
  });
});

function createMailService(overrides: Record<string, unknown>) {
  const configService = {
    getOrThrow: jest.fn((key: string) => {
      const config: Record<string, string | number> = {
        PORT: 4000,
        APP_URL: 'http://localhost:4000',
        FRONTEND_URL: 'http://localhost:3000',
        JWT_ACCESS_SECRET: 'development-access-secret-123',
        JWT_REFRESH_SECRET: 'development-refresh-secret-123',
        JWT_ACCESS_TTL: '15m',
        JWT_REFRESH_TTL: '7d',
        REFRESH_COOKIE_NAME: 'archon_refresh_token',
        NODE_ENV:
          typeof overrides.NODE_ENV === 'string'
            ? overrides.NODE_ENV
            : 'development',
      };

      return config[key];
    }),
    get: jest.fn((key: string) => {
      if (key in overrides) {
        return overrides[key];
      }

      return undefined;
    }),
  } as unknown as ConfigService;

  return new MailService(configService);
}
