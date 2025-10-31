import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AppointmentsService } from './appointments.service';
import { AppointmentsController } from './appointments.controller';
import { Appointment, AppointmentSchema } from './schemas/appointment.schemas';
import {
  MedicalRecord,
  MedicalRecordSchema,
} from '../medical-records/schemas/medical-record.schemas';
import { Payment, PaymentSchema } from '../payments/schemas/payment.schemas';
import { AppointmentNotificationGateway } from './appointment-notification.gateway';
import { AppointmentEmailService } from './appointment-email.service';
import { AppointmentReminderService } from './appointment-reminder.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { PaymentsModule } from '../payments/payments.module';
import { VouchersModule } from '../vouchers/vouchers.module';
import {
  FollowUpSuggestion,
  FollowUpSuggestionSchema,
} from './schemas/follow-up-suggestion.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Appointment.name, schema: AppointmentSchema },
      { name: MedicalRecord.name, schema: MedicalRecordSchema },
      { name: Payment.name, schema: PaymentSchema },
      { name: FollowUpSuggestion.name, schema: FollowUpSuggestionSchema },
    ]),
    NotificationsModule,
    PaymentsModule,
    VouchersModule,
  ],
  controllers: [AppointmentsController],
  providers: [
    AppointmentsService,
    AppointmentNotificationGateway,
    AppointmentEmailService,
    AppointmentReminderService,
  ],
  exports: [
    AppointmentsService,
    AppointmentNotificationGateway,
    AppointmentEmailService,
    AppointmentReminderService,
  ],
})
export class AppointmentsModule {}
