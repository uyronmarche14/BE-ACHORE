import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, type Transporter } from 'nodemailer';
import { Resend } from 'resend';
import { createInternalException } from '../../../common/utils/api-exception.util';
import { getMailRuntimeConfig } from '../../../config/runtime-config';

type SendMailParams = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: Transporter | null = null;
  private resendClient: Resend | null = null;
  private readonly runtimeConfig: ReturnType<typeof getMailRuntimeConfig>;

  constructor(configService: ConfigService) {
    this.runtimeConfig = getMailRuntimeConfig(configService);
  }

  async sendMail(params: SendMailParams) {
    const sendStartedAt = Date.now();
    if (this.runtimeConfig.mailProvider === 'resend') {
      await this.sendWithResend(params, sendStartedAt);
      return;
    }

    await this.sendWithSmtp(params, sendStartedAt);
  }

  private async sendWithResend(params: SendMailParams, sendStartedAt: number) {
    const missingConfiguration = this.getMissingResendConfigurationKeys();
    const resendClient = this.getResendClient();
    const fromAddress = this.runtimeConfig.mailFrom;

    if (!resendClient || !fromAddress || missingConfiguration.length > 0) {
      this.logger.error(
        `Resend is not fully configured. Missing ${missingConfiguration.join(', ')}. Refusing to send mail to ${params.to} with subject "${params.subject}".`,
      );
      throw createInternalException({
        message:
          'Email delivery is not configured. Complete mail provider setup before using verification or invite email flows.',
      });
    }

    try {
      this.logger.log(
        `Attempting Resend delivery to ${params.to} with subject "${params.subject}".`,
      );
      const response = await resendClient.emails.send({
        from: fromAddress,
        to: params.to,
        subject: params.subject,
        text: params.text,
        html: params.html,
      });

      if (response.error) {
        const resendError = new Error(response.error.message);
        resendError.name = response.error.name;

        this.logger.error(
          `Resend delivery failed for ${params.to} with subject "${params.subject}" after ${Date.now() - sendStartedAt}ms. ${response.error.name}: ${response.error.message}`,
        );
        throw resendError;
      }

      this.logger.log(
        `Resend delivery to ${params.to} succeeded in ${Date.now() - sendStartedAt}ms with id ${response.data?.id ?? 'unknown'}.`,
      );
    } catch (error) {
      if (this.shouldFallbackToSmtp(error)) {
        this.logger.warn(
          `Resend delivery failed for ${params.to}; falling back to SMTP in ${this.runtimeConfig.nodeEnv}.`,
        );

        await this.sendWithSmtp(params, sendStartedAt);
        return;
      }

      this.logger.error(
        `Failed to send mail to ${params.to} with subject "${params.subject}" after ${Date.now() - sendStartedAt}ms via Resend.`,
        error instanceof Error ? error.stack : undefined,
      );
      throw createInternalException({
        message:
          'Unable to send email right now. Check email delivery configuration and try again.',
      });
    }
  }

  private async sendWithSmtp(params: SendMailParams, sendStartedAt: number) {
    const missingConfiguration = this.getMissingSmtpConfigurationKeys();
    const transporter = this.getTransporter();
    const fromAddress = this.runtimeConfig.mailFrom;

    if (!transporter || !fromAddress || missingConfiguration.length > 0) {
      this.logger.error(
        `SMTP is not fully configured. Missing ${missingConfiguration.join(', ')}. Refusing to send mail to ${params.to} with subject "${params.subject}".`,
      );
      throw createInternalException({
        message:
          'Email delivery is not configured. Complete mail provider setup before using verification or invite email flows.',
      });
    }

    try {
      this.logger.log(
        `Attempting SMTP delivery to ${params.to} with subject "${params.subject}".`,
      );
      await transporter.sendMail({
        from: fromAddress,
        to: params.to,
        subject: params.subject,
        text: params.text,
        html: params.html,
      });
      this.logger.log(
        `SMTP delivery to ${params.to} succeeded in ${Date.now() - sendStartedAt}ms.`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send mail to ${params.to} with subject "${params.subject}" after ${Date.now() - sendStartedAt}ms.`,
        error instanceof Error ? error.stack : undefined,
      );
      throw createInternalException({
        message:
          'Unable to send email right now. Check email delivery configuration and try again.',
      });
    }
  }

  private getTransporter() {
    if (this.transporter) {
      return this.transporter;
    }

    if (
      !this.runtimeConfig.smtpHost ||
      !this.runtimeConfig.smtpPort ||
      !this.runtimeConfig.smtpUser ||
      !this.runtimeConfig.smtpPass
    ) {
      return null;
    }

    this.transporter = createTransport({
      host: this.runtimeConfig.smtpHost,
      port: this.runtimeConfig.smtpPort,
      secure:
        this.runtimeConfig.smtpSecure ?? this.runtimeConfig.smtpPort === 465,
      connectionTimeout: this.runtimeConfig.smtpConnectionTimeoutMs,
      auth: {
        user: this.runtimeConfig.smtpUser,
        pass: this.runtimeConfig.smtpPass,
      },
    });
    this.logger.log(
      `Initialized SMTP transporter for ${this.runtimeConfig.smtpHost}:${this.runtimeConfig.smtpPort} secure=${this.runtimeConfig.smtpSecure ?? this.runtimeConfig.smtpPort === 465} timeout=${this.runtimeConfig.smtpConnectionTimeoutMs}ms.`,
    );

    return this.transporter;
  }

  private getResendClient() {
    if (this.resendClient) {
      return this.resendClient;
    }

    if (!this.runtimeConfig.resendApiKey) {
      return null;
    }

    this.resendClient = new Resend(this.runtimeConfig.resendApiKey);
    this.logger.log(
      'Initialized Resend client for transactional mail delivery.',
    );

    return this.resendClient;
  }

  private getMissingResendConfigurationKeys() {
    return [
      this.runtimeConfig.resendApiKey ? null : 'RESEND_API_KEY',
      this.runtimeConfig.mailFrom ? null : 'MAIL_FROM or SMTP_FROM',
    ].filter((value): value is string => value !== null);
  }

  private getMissingSmtpConfigurationKeys() {
    return [
      this.runtimeConfig.smtpHost ? null : 'SMTP_HOST',
      this.runtimeConfig.smtpPort ? null : 'SMTP_PORT',
      this.runtimeConfig.smtpUser ? null : 'SMTP_USER',
      this.runtimeConfig.smtpPass ? null : 'SMTP_PASS',
      this.runtimeConfig.mailFrom ? null : 'MAIL_FROM or SMTP_FROM',
    ].filter((value): value is string => value !== null);
  }

  private shouldFallbackToSmtp(error: unknown) {
    if (this.runtimeConfig.nodeEnv === 'production') {
      return false;
    }

    if (!this.hasSmtpFallbackConfiguration()) {
      return false;
    }

    if (!(error instanceof Error)) {
      return false;
    }

    return (
      error.name === 'validation_error' ||
      /domain is not verified/i.test(error.message)
    );
  }

  private hasSmtpFallbackConfiguration() {
    return this.getMissingSmtpConfigurationKeys().length === 0;
  }
}
