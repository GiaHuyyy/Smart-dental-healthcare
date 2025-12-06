import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import sgMail from '@sendgrid/mail';
import * as fs from 'fs';
import * as path from 'path';
import * as Handlebars from 'handlebars';

export interface SendMailOptions {
  to: string;
  subject: string;
  template?: string;
  context?: Record<string, any>;
  html?: string;
  text?: string;
}

@Injectable()
export class SendGridService implements OnModuleInit {
  private readonly logger = new Logger(SendGridService.name);
  private fromEmail: string;
  private fromName: string;
  private replyTo: string;
  private templates: Map<string, Handlebars.TemplateDelegate> = new Map();

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const apiKey = this.configService.get<string>('SENDGRID_API_KEY');
    if (!apiKey) {
      this.logger.warn(
        'SENDGRID_API_KEY not configured. Email sending will fail.',
      );
      return;
    }

    sgMail.setApiKey(apiKey);

    this.fromEmail = this.configService.get<string>(
      'SENDGRID_FROM_EMAIL',
      'noreply@smartdental.com',
    );
    this.fromName = 'Smart Dental Healthcare';
    this.replyTo = this.configService.get<string>(
      'SENDGRID_REPLY_TO',
      this.fromEmail,
    );

    // Preload templates
    this.loadTemplates();

    this.logger.log('SendGrid service initialized successfully');
  }

  private loadTemplates() {
    const templatesDir = path.join(__dirname, 'templates');

    if (!fs.existsSync(templatesDir)) {
      this.logger.warn(`Templates directory not found: ${templatesDir}`);
      return;
    }

    const templateFiles = fs
      .readdirSync(templatesDir)
      .filter((f) => f.endsWith('.hbs'));

    for (const file of templateFiles) {
      const templateName = file.replace('.hbs', '');
      const templatePath = path.join(templatesDir, file);
      const templateContent = fs.readFileSync(templatePath, 'utf-8');
      this.templates.set(templateName, Handlebars.compile(templateContent));
      this.logger.debug(`Loaded template: ${templateName}`);
    }

    this.logger.log(`Loaded ${templateFiles.length} email templates`);
  }

  private renderTemplate(
    templateName: string,
    context: Record<string, any>,
  ): string {
    const template = this.templates.get(templateName);
    if (!template) {
      throw new Error(`Template not found: ${templateName}`);
    }
    return template(context);
  }

  async sendMail(options: SendMailOptions): Promise<boolean> {
    try {
      let htmlContent = options.html;

      // Render template if specified
      if (options.template && options.context) {
        htmlContent = this.renderTemplate(options.template, options.context);
      }

      if (!htmlContent && !options.text) {
        throw new Error(
          'Either html, text, or template with context is required',
        );
      }

      // Build message for SendGrid

      const msg: any = {
        to: options.to,
        from: {
          email: this.fromEmail,
          name: this.fromName,
        },
        replyTo: this.replyTo,
        subject: options.subject,
      };

      if (htmlContent) {
        msg.html = htmlContent;
      }
      if (options.text) {
        msg.text = options.text;
      }

      await sgMail.send(msg);
      this.logger.log(`Email sent successfully to ${options.to}`);
      return true;
    } catch (error: any) {
      this.logger.error(
        `Failed to send email to ${options.to}: ${error.message}`,
        error.response?.body || error.stack,
      );
      return false;
    }
  }
}
