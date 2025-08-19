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
          host: config.get('MAIL_HOST', 'smtp.gmail.com'),
          secure: false,
          auth: {
            user: config.get('MAILDEV_INCOMING_USER'),
            pass: config.get('MAILDEV_INCOMING_PASS'),
          },
        },
        defaults: {
          from: `"Smart Dental Healthcare" <${config.get('MAIL_FROM', 'noreply@smartdental.com')}>`,
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