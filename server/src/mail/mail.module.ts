import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SendGridService } from './sendgrid.service';
import { ZeroBounceService } from './zerobounce.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [SendGridService, ZeroBounceService],
  exports: [SendGridService, ZeroBounceService],
})
export class MailModule {}
