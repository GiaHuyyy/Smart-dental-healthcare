import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class AppointmentEmailService {
  private readonly logger = new Logger(AppointmentEmailService.name);

  constructor(private readonly mailerService: MailerService) {}

  /**
   * Send email to doctor about new appointment
   */
  async sendNewAppointmentEmailToDoctor(
    appointment: any,
    doctor: any,
    patient: any,
  ) {
    try {
      const appointmentDate = new Date(
        appointment.appointmentDate,
      ).toLocaleDateString('vi-VN', {
        weekday: 'long',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });

      const viewUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/doctor/schedule?appointmentId=${appointment._id}`;

      await this.mailerService.sendMail({
        to: doctor.email,
        subject: 'Thông báo: Lịch hẹn mới',
        template: 'appointment-new',
        context: {
          doctorName: doctor.fullName,
          patientName: patient.fullName,
          patientPhone: patient.phone,
          appointmentDate,
          startTime: appointment.startTime,
          endTime: appointment.endTime,
          appointmentType: appointment.appointmentType,
          consultationFee: appointment.consultationFee || 0,
          notes: appointment.notes,
          viewUrl,
        },
      });

      this.logger.log(`Sent new appointment email to doctor ${doctor.email}`);
    } catch (error) {
      this.logger.error('Failed to send email to doctor:', error);
    }
  }

  /**
   * Send cancellation email
   */
  async sendCancellationEmail(
    appointment: any,
    doctor: any,
    patient: any,
    cancelledBy: 'doctor' | 'patient',
    reason?: string,
  ) {
    try {
      const appointmentDate = new Date(
        appointment.appointmentDate,
      ).toLocaleDateString('vi-VN', {
        weekday: 'long',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });

      const recipient = cancelledBy === 'doctor' ? patient : doctor;
      const cancellerName =
        cancelledBy === 'doctor' ? `BS. ${doctor.fullName}` : patient.fullName;
      const otherPartyName =
        cancelledBy === 'doctor' ? patient.fullName : `BS. ${doctor.fullName}`;
      const viewUrl =
        cancelledBy === 'doctor'
          ? `${process.env.CLIENT_URL || 'http://localhost:3000'}/patient/appointments/my-appointments`
          : `${process.env.CLIENT_URL || 'http://localhost:3000'}/doctor/schedule`;

      await this.mailerService.sendMail({
        to: recipient.email,
        subject: 'Thông báo: Lịch hẹn đã bị hủy',
        template: 'appointment-cancelled',
        context: {
          recipientName: recipient.fullName,
          cancellerName,
          otherPartyName,
          appointmentDate,
          startTime: appointment.startTime,
          endTime: appointment.endTime,
          consultationFee: appointment.consultationFee || 0,
          reason,
          isDoctor: cancelledBy === 'doctor', // Nếu doctor hủy → recipient là patient → isDoctor = false (FIXED!)
          viewUrl,
        },
      });

      this.logger.log(`Sent cancellation email to ${recipient.email}`);
    } catch (error) {
      this.logger.error('Failed to send cancellation email:', error);
    }
  }

  /**
   * Send reminder email to both doctor and patient (30 minutes before appointment)
   */
  async sendReminderEmail(
    appointment: any,
    doctor: any,
    patient: any,
    recipientType: 'doctor' | 'patient',
  ) {
    try {
      const appointmentDate = new Date(
        appointment.appointmentDate,
      ).toLocaleDateString('vi-VN', {
        weekday: 'long',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });

      const recipient = recipientType === 'doctor' ? doctor : patient;
      const otherParty = recipientType === 'doctor' ? patient : doctor;
      const otherPartyName =
        recipientType === 'doctor'
          ? patient.fullName
          : `BS. ${doctor.fullName}`;
      const viewUrl =
        recipientType === 'doctor'
          ? `${process.env.CLIENT_URL || 'http://localhost:3000'}/doctor/schedule`
          : `${process.env.CLIENT_URL || 'http://localhost:3000'}/patient/appointments/my-appointments`;

      await this.mailerService.sendMail({
        to: recipient.email,
        subject: '⏰ Nhắc nhở: Lịch hẹn sắp bắt đầu',
        template: 'appointment-reminder',
        context: {
          recipientName: recipient.fullName,
          otherPartyName,
          otherPartyPhone: otherParty.phone || '',
          appointmentDate,
          startTime: appointment.startTime,
          endTime: appointment.endTime,
          appointmentType: appointment.appointmentType,
          clinicAddress: doctor.address || doctor.clinicAddress || '',
          timeUntil: '30 phút',
          isDoctor: recipientType === 'doctor',
          viewUrl,
        },
      });

      this.logger.log(
        `Sent reminder email to ${recipientType} ${recipient.email}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send reminder email to ${recipientType}:`,
        error,
      );
    }
  }
}
