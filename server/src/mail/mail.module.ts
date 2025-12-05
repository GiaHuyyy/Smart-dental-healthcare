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
          port: config.get('MAIL_PORT', 587),
          secure: false, // true for 465, false for other ports
          auth: {
            user: config.get('MAILDEV_INCOMING_USER'),
            pass: config.get('MAILDEV_INCOMING_PASS'),
          },
          // Tăng timeout cho môi trường cloud (Render)
          connectionTimeout: 30000, // 30 seconds
          greetingTimeout: 30000,
          socketTimeout: 60000, // 60 seconds
          // Pool connections để tái sử dụng
          pool: true,
          maxConnections: 3,
          maxMessages: 100,
          // TLS options
          tls: {
            rejectUnauthorized: false, // Cho phép self-signed certs
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
