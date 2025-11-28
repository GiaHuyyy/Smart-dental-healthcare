import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { MailModule } from './mail/mail.module';
import { AiChatHistoryModule } from './modules/ai-chat-history/ai-chat-history.module';
import { AiChatModule } from './modules/ai-chat/ai-chat.module';
import { AppointmentsModule } from './modules/appointments/appointments.module';
import { ChatModule } from './modules/chat/chat.module';
import { DoctorScheduleModule } from './modules/doctor-schedule/doctor-schedule.module';
import { GeocodingModule } from './modules/geocoding/geocoding.module';
import { ImageAnalysisModule } from './modules/image-analysis/image-analysis.module';
import { MedicalRecordsModule } from './modules/medical-records/medical-records.module';
import { MedicationsModule } from './modules/medications/medications.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { PrescriptionsModule } from './modules/prescriptions/prescriptions.module';
import { RealtimeChatModule } from './modules/realtime-chat/realtime-chat.module';
import { ReportsModule } from './modules/reports/reports.module';
import { RevenueModule } from './modules/revenue/revenue.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { UsersModule } from './modules/users/users.module';
import { VouchersModule } from './modules/vouchers/vouchers.module';
import { WalletModule } from './modules/wallet/wallet.module';
import { WebRTCModule } from './modules/webrtc/webrtc.module';

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
    ScheduleModule.forRoot(),
    MailModule,
    UsersModule,
    AuthModule,
    AiChatModule,
    AiChatHistoryModule,
    GeocodingModule,
    ImageAnalysisModule,
    ChatModule,
    AppointmentsModule,
    DoctorScheduleModule,
    MedicalRecordsModule,
    MedicationsModule,
    NotificationsModule,
    PaymentsModule,
    PrescriptionsModule,
    ReportsModule,
    ReviewsModule,
    RealtimeChatModule,
    WebRTCModule,
    RevenueModule,
    WalletModule,
    VouchersModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // {
    //   provide: APP_INTERCEPTOR,
    //   useClass: TransformInterceptor,
    // },
  ],
})
export class AppModule {}
