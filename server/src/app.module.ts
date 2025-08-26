import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/passport/jwt-auth.guard';
import { AppointmentsModule } from './modules/appointments/appointments.module';
import { MedicalRecordsModule } from './modules/medical-records/medical-records.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { ReportsModule } from './modules/reports/reports.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { UsersModule } from './modules/users/users.module';
import { AiChatModule } from './modules/ai-chat/ai-chat.module';
import { ImageAnalysisModule } from './modules/image-analysis/image-analysis.module';
import { ChatModule } from './modules/chat/chat.module';
import { MailModule } from './mail/mail.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI'),
      }),
      inject: [ConfigService],
    }),
    MailModule,
    UsersModule,
    AuthModule,
    AiChatModule,
    ImageAnalysisModule,
    ChatModule,
    AppointmentsModule,
    MedicalRecordsModule,
    NotificationsModule,
    PaymentsModule,
    ReportsModule,
    ReviewsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
