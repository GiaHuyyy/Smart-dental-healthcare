import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { MailModule } from './mail/mail.module';
import { AiChatModule } from './modules/ai-chat/ai-chat.module';
import { AiChatHistoryModule } from './modules/ai-chat-history/ai-chat-history.module';
import { AppointmentsModule } from './modules/appointments/appointments.module';
import { ChatModule } from './modules/chat/chat.module';
import { ImageAnalysisModule } from './modules/image-analysis/image-analysis.module';
import { MedicalRecordsModule } from './modules/medical-records/medical-records.module';
import { MedicationsModule } from './modules/medications/medications.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { PrescriptionsModule } from './modules/prescriptions/prescriptions.module';
import { ReportsModule } from './modules/reports/reports.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { UsersModule } from './modules/users/users.module';
import { RealtimeChatModule } from './modules/realtime-chat/realtime-chat.module';

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
    AiChatHistoryModule,
    ImageAnalysisModule,
    ChatModule,
    AppointmentsModule,
    MedicalRecordsModule,
    MedicationsModule,
    NotificationsModule,
    PaymentsModule,
    PrescriptionsModule,
    ReportsModule,
    ReviewsModule,
    RealtimeChatModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
