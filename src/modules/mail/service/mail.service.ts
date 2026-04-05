import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, type Transporter } from 'nodemailer';
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
  private readonly runtimeConfig: ReturnType<typeof getMailRuntimeConfig>;

  constructor(configService: ConfigService) {
    this.runtimeConfig = getMailRuntimeConfig(configService);
  }

  async sendMail(params: SendMailParams) {
    const sendStartedAt = Date.now();
    const missingConfiguration = this.getMissingConfigurationKeys();
    const transporter = this.getTransporter();
    const fromAddress = this.runtimeConfig.smtpFrom;

    if (!transporter || !fromAddress || missingConfiguration.length > 0) {
      this.logger.error(
        `SMTP is not fully configured. Missing ${missingConfiguration.join(', ')}. Refusing to send mail to ${params.to} with subject "${params.subject}".`,
      );
      throw createInternalException({
        message:
          'Email delivery is not configured. Complete SMTP setup before using verification or invite email flows.',
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
          'Unable to send email right now. Check SMTP credentials and try again.',
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
      auth: {
        user: this.runtimeConfig.smtpUser,
        pass: this.runtimeConfig.smtpPass,
      },
    });
    this.logger.log(
      `Initialized SMTP transporter for ${this.runtimeConfig.smtpHost}:${this.runtimeConfig.smtpPort} secure=${this.runtimeConfig.smtpSecure ?? this.runtimeConfig.smtpPort === 465}.`,
    );

    return this.transporter;
  }

  private getMissingConfigurationKeys() {
    return [
      this.runtimeConfig.smtpHost ? null : 'SMTP_HOST',
      this.runtimeConfig.smtpPort ? null : 'SMTP_PORT',
      this.runtimeConfig.smtpUser ? null : 'SMTP_USER',
      this.runtimeConfig.smtpPass ? null : 'SMTP_PASS',
      this.runtimeConfig.smtpFrom ? null : 'SMTP_FROM',
    ].filter((value): value is string => value !== null);
  }
}
