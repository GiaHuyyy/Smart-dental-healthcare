import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AppointmentsService } from './appointments.service';
import { AppointmentsController } from './appointments.controller';
import { Appointment, AppointmentSchema } from './schemas/appointment.schemas';
import {
  MedicalRecord,
  MedicalRecordSchema,
} from '../medical-records/schemas/medical-record.schemas';
import { AppointmentNotificationGateway } from './appointment-notification.gateway';
import { AppointmentEmailService } from './appointment-email.service';
import { AppointmentReminderService } from './appointment-reminder.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Appointment.name, schema: AppointmentSchema },
      { name: MedicalRecord.name, schema: MedicalRecordSchema },
    ]),
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
