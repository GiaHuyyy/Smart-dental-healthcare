import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AppointmentEmailService } from './appointment-email.service';
import { AppointmentNotificationGateway } from './appointment-notification.gateway';

@Injectable()
export class AppointmentReminderService {
  private readonly logger = new Logger(AppointmentReminderService.name);
  private sentReminders = new Set<string>(); // Track sent reminders to avoid duplicates

  constructor(
    @InjectModel('Appointment') private appointmentModel: Model<any>,
    private readonly emailService: AppointmentEmailService,
    private readonly appointmentGateway: AppointmentNotificationGateway,
  ) {}

  /**
   * Cron job chạy mỗi 5 phút để check appointments cần gửi reminder
   * Gửi reminder 30 phút trước giờ khám
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async checkAndSendReminders() {
    this.logger.log('Running appointment reminder check...');

    try {
      const now = new Date();
      const thirtyMinutesLater = new Date(now.getTime() + 30 * 60 * 1000);
      const thirtyFiveMinutesLater = new Date(now.getTime() + 35 * 60 * 1000);

      // Find appointments that:
      // 1. Status is 'confirmed'
      // 2. Start time is between 30-35 minutes from now
      // 3. Appointment date is today
      const todayStart = new Date(now.setHours(0, 0, 0, 0));
      const todayEnd = new Date(now.setHours(23, 59, 59, 999));

      const appointments = await this.appointmentModel
        .find({
          status: 'confirmed',
          appointmentDate: {
            $gte: todayStart,
            $lte: todayEnd,
          },
        })
        .populate('doctorId', 'fullName email phone address clinicAddress')
        .populate('patientId', 'fullName email phone')
        .exec();

      this.logger.log(
        `Found ${appointments.length} confirmed appointments today`,
      );

      for (const appointment of appointments) {
        const appointmentDateTime = this.getAppointmentDateTime(appointment);

        // Check if appointment is in the 30-35 minute window
        if (
          appointmentDateTime >= thirtyMinutesLater &&
          appointmentDateTime <= thirtyFiveMinutesLater
        ) {
          const reminderKey = `${appointment._id}_${appointmentDateTime.getTime()}`;

          // Skip if reminder already sent for this appointment
          if (this.sentReminders.has(reminderKey)) {
            this.logger.log(
              `Reminder already sent for appointment ${appointment._id}`,
            );
            continue;
          }

          await this.sendReminder(appointment);
          this.sentReminders.add(reminderKey);

          // Clean up old reminders (older than 2 hours)
          this.cleanupOldReminders();
        }
      }
    } catch (error) {
      this.logger.error('Error checking reminders:', error);
    }
  }

  /**
   * Send reminder to both doctor and patient
   */
  private async sendReminder(appointment: any) {
    try {
      const doctor = appointment.doctorId;
      const patient = appointment.patientId;

      if (!doctor || !patient) {
        this.logger.warn(
          `Missing doctor or patient for appointment ${appointment._id}`,
        );
        return;
      }

      this.logger.log(
        `Sending reminder for appointment ${appointment._id} at ${appointment.startTime}`,
      );

      // Send email to doctor
      await this.emailService.sendReminderEmail(
        appointment,
        doctor,
        patient,
        'doctor',
      );

      // Send email to patient
      await this.emailService.sendReminderEmail(
        appointment,
        doctor,
        patient,
        'patient',
      );

      // Send socket notification to doctor
      this.appointmentGateway.sendAppointmentReminder(doctor._id.toString(), {
        appointmentId: appointment._id.toString(),
        patientName: patient.fullName,
        startTime: appointment.startTime,
        endTime: appointment.endTime,
        message: `Nhắc nhở: Lịch hẹn với ${patient.fullName} sẽ bắt đầu lúc ${appointment.startTime}`,
        linkTo: '/doctor/schedule',
      });

      // Send socket notification to patient
      this.appointmentGateway.sendAppointmentReminder(patient._id.toString(), {
        appointmentId: appointment._id.toString(),
        doctorName: doctor.fullName,
        startTime: appointment.startTime,
        endTime: appointment.endTime,
        message: `Nhắc nhở: Lịch hẹn với BS. ${doctor.fullName} sẽ bắt đầu lúc ${appointment.startTime}`,
        linkTo: '/patient/appointments/my-appointments',
      });

      this.logger.log(
        `Successfully sent reminders for appointment ${appointment._id}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send reminder for appointment ${appointment._id}:`,
        error,
      );
    }
  }

  /**
   * Get appointment datetime by combining date and time
   */
  private getAppointmentDateTime(appointment: any): Date {
    const date = new Date(appointment.appointmentDate);
    const [hours, minutes] = appointment.startTime.split(':');
    date.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
    return date;
  }

  /**
   * Clean up old sent reminders from memory (older than 2 hours)
   */
  private cleanupOldReminders() {
    const twoHoursAgo = new Date().getTime() - 2 * 60 * 60 * 1000;
    const remindersToKeep = new Set<string>();

    for (const key of this.sentReminders) {
      const timestamp = parseInt(key.split('_')[1], 10);
      if (timestamp > twoHoursAgo) {
        remindersToKeep.add(key);
      }
    }

    this.sentReminders = remindersToKeep;
    this.logger.log(
      `Cleaned up old reminders. Current count: ${this.sentReminders.size}`,
    );
  }

  /**
   * Manual trigger for testing (can be called via API endpoint)
   */
  async testReminder(appointmentId: string) {
    try {
      const appointment = await this.appointmentModel
        .findById(appointmentId)
        .populate('doctorId', 'fullName email phone address clinicAddress')
        .populate('patientId', 'fullName email phone')
        .exec();

      if (!appointment) {
        throw new Error('Appointment not found');
      }

      if (appointment.status !== 'confirmed') {
        throw new Error('Appointment must be confirmed to send reminder');
      }

      await this.sendReminder(appointment);
      return { success: true, message: 'Test reminder sent successfully' };
    } catch (error) {
      this.logger.error('Failed to send test reminder:', error);
      throw error;
    }
  }
}
