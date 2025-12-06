import { Module } from '@nestjs/common';
import { MailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import { ConfigService } from '@nestjs/config';
import { join } from 'path';

@Module({
  imports: [
    MailerModule.forRootAsync({
      useFactory: async (config: ConfigService) => ({
        transport: {
          // SendGrid SMTP Configuration
          host: 'smtp.sendgrid.net',
          port: 587,
          secure: false,
          auth: {
            user: 'apikey', // SendGrid requires 'apikey' as username
            pass: config.get('SENDGRID_API_KEY'),
          },
          // Timeout settings cho cloud environment
          connectionTimeout: 30000,
          greetingTimeout: 30000,
          socketTimeout: 60000,
        },
        defaults: {
          from: `"Smart Dental Healthcare" <${config.get('SENDGRID_FROM_EMAIL', 'noreply@smartdental.com')}>`,
          replyTo: config.get('SENDGRID_REPLY_TO'),
        },
        template: {
          dir: join(__dirname, 'templates'),
          adapter: new HandlebarsAdapter(),
          options: {
            strict: true,
          },
        },
      }),
      inject: [ConfigService],
    }),
  ],
  exports: [MailerModule],
})
export class MailModule {}
