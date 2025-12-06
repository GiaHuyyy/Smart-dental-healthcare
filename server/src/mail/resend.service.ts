import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
}

@Injectable()
export class ResendService {
  private readonly logger = new Logger(ResendService.name);
  private readonly resend: Resend;
  private readonly defaultFrom: string;
  private readonly isEnabled: boolean;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');
    this.isEnabled = !!apiKey;

    if (this.isEnabled) {
      this.resend = new Resend(apiKey);
      this.logger.log('✅ Resend email service initialized');
    } else {
      this.logger.warn('⚠️ RESEND_API_KEY not found, email service disabled');
    }

    this.defaultFrom =
      this.configService.get<string>('MAIL_FROM') ||
      'Smart Dental Healthcare <onboarding@resend.dev>';
  }

  /**
   * Send email using Resend API
   */
  async sendEmail(options: SendEmailOptions): Promise<boolean> {
    if (!this.isEnabled) {
      this.logger.warn(
        'Email service disabled, skipping email:',
        options.subject,
      );
      return false;
    }

    try {
      const { to, subject, html, from } = options;

      const result = await this.resend.emails.send({
        from: from || this.defaultFrom,
        to: Array.isArray(to) ? to : [to],
        subject,
        html,
      });

      if (result.error) {
        this.logger.error('Resend API error:', result.error);
        return false;
      }

      this.logger.log(
        `✅ Email sent successfully to ${to}, ID: ${result.data?.id}`,
      );
      return true;
    } catch (error) {
      this.logger.error('Failed to send email via Resend:', error);
      return false;
    }
  }

  /**
   * Check if email service is enabled
   */
  isServiceEnabled(): boolean {
    return this.isEnabled;
  }
}
