import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { renderForgotPasswordEmailTemplate } from './templates/forgot-password-email.template';
import type {
  SendEmailInput,
  SendForgotPasswordEmailInput,
} from './email.types';

type SmtpConfig = {
  host: string;
  port: number;
  secure: boolean;
  from: string;
  auth?: {
    user: string;
    pass: string;
  };
};

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: Transporter | null = null;

  constructor(private readonly configService: ConfigService) {}

  async send(input: SendEmailInput): Promise<void> {
    const smtpConfig = this.getSmtpConfig();

    if (!smtpConfig) {
      this.logDevelopmentEmailPreview(input);
      return;
    }

    const transporter = this.getTransporter(smtpConfig);

    await transporter.sendMail({
      from: smtpConfig.from,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
    });
  }

  sendForgotPasswordEmail(input: SendForgotPasswordEmailInput): Promise<void> {
    const appName =
      this.configService.get<string>('APP_NAME') ?? "Cooper's Barbershop";
    const firstName = input.firstName?.trim() || 'there';
    const renderedEmail = renderForgotPasswordEmailTemplate({
      appName,
      firstName,
      resetCode: input.resetCode,
      expiresInMinutes: input.expiresInMinutes,
    });

    return this.send({
      to: input.to,
      subject: `Reset your ${appName} password`,
      html: renderedEmail.html,
      text: renderedEmail.text,
    });
  }

  private getTransporter(smtpConfig: SmtpConfig): Transporter {
    if (this.transporter) {
      return this.transporter;
    }

    this.transporter = nodemailer.createTransport({
      host: smtpConfig.host,
      port: smtpConfig.port,
      secure: smtpConfig.secure,
      auth: smtpConfig.auth,
    });

    return this.transporter;
  }

  private getSmtpConfig(): SmtpConfig | null {
    const host = this.configService.get<string>('SMTP_HOST');
    const portValue = this.configService.get<string>('SMTP_PORT');
    const from = this.configService.get<string>('EMAIL_FROM');

    if (!host || !portValue || !from) {
      this.assertEmailCanUsePreviewMode();
      return null;
    }

    const port = Number(portValue);

    if (!Number.isInteger(port) || port <= 0) {
      throw new Error('SMTP_PORT must be a positive integer');
    }

    const username =
      this.configService.get<string>('SMTP_USERNAME') ??
      this.configService.get<string>('SMTP_USER');
    const password = this.configService.get<string>('SMTP_PASSWORD');

    return {
      host,
      port,
      from,
      secure: this.configService.get<string>('SMTP_SECURE') === 'true',
      auth:
        username && password
          ? {
              user: username,
              pass: password,
            }
          : undefined,
    };
  }

  private assertEmailCanUsePreviewMode(): void {
    if (this.isDevelopEnvironment()) {
      return;
    }

    throw new Error(
      'SMTP_HOST, SMTP_PORT, and EMAIL_FROM are required outside develop environment',
    );
  }

  private isDevelopEnvironment(): boolean {
    const env =
      this.configService.get<string>('ENV') ?? process.env.ENV ?? 'develop';

    return env === 'develop' || env === 'dev' || env === 'development';
  }

  private logDevelopmentEmailPreview(input: SendEmailInput): void {
    this.logger.log(
      [
        'Email preview mode is active because SMTP is not configured.',
        `To: ${input.to}`,
        `Subject: ${input.subject}`,
        `Text: ${input.text ?? 'No text body provided.'}`,
      ].join('\n'),
    );
  }
}
