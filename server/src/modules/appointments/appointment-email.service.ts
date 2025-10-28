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

  /**
   * Send auto-reject email to patient when appointment is cancelled due to doctor not confirming
   */
  async sendAutoRejectEmailToPatient(
    appointment: any,
    patient: any,
    doctor: any,
    refundIssued = false,
    refundAmount = 0,
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

      // Build refund section if applicable
      let refundSection = '';
      if (refundIssued) {
        refundSection = `
          <div style="background-color: #ecfdf5; padding: 15px; border-radius: 8px; border-left: 4px solid #10b981; margin: 20px 0;">
            <p style="margin: 0; color: #065f46;">
              <strong>💰 Hoàn tiền:</strong> Chúng tôi đã hoàn lại <strong>100% phí khám (${refundAmount.toLocaleString('vi-VN')} VND)</strong> vào tài khoản của bạn.
            </p>
          </div>
        `;
      }

      await this.mailerService.sendMail({
        to: patient.email,
        subject: '❌ Lịch hẹn đã bị hủy',
        html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
          <h2 style="color: #dc2626; margin-bottom: 20px;">❌ Lịch hẹn đã bị hủy</h2>

          <p style="font-size: 16px; color: #374151;">Kính gửi <strong>${patient.fullName}</strong>,</p>

          <div style="background-color: #fef2f2; padding: 15px; border-radius: 8px; border-left: 4px solid #dc2626; margin: 20px 0;">
            <p style="margin: 0; color: #991b1b;">
              Rất xin lỗi, lịch hẹn <strong>${appointment.startTime}</strong> ngày <strong>${appointmentDate}</strong>
              của bạn với <strong>Bác sĩ ${doctor.fullName}</strong> đã bị hủy do <strong>Bác sĩ không kịp xác nhận</strong>.
            </p>
          </div>

          <p style="font-size: 16px; color: #374151;">Vui lòng đặt lại một lịch hẹn khác.</p>

          ${refundSection}

          <div style="background-color: #f0fdf4; padding: 15px; border-radius: 8px; border-left: 4px solid #22c55e; margin: 20px 0;">
            <p style="margin: 0; color: #166534;">
              <strong>🎁 Quà xin lỗi:</strong> Chúng tôi đã gửi cho bạn một voucher giảm giá <strong>5%</strong>
              cho lần khám tiếp theo để xin lỗi vì sự bất tiện này.
            </p>
          </div>

          <p style="font-size: 16px; color: #374151;">Chúng tôi thành thật xin lỗi vì sự bất tiện này.</p>

          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
            <p style="margin: 0; color: #6b7280; font-size: 14px;">
              Trân trọng,<br/>
              <strong>Smart Dental Healthcare</strong>
            </p>
          </div>
        </div>
        `,
      });

      this.logger.log(`Sent auto-reject email to patient ${patient.email}`);
    } catch (error) {
      this.logger.error('Failed to send auto-reject email to patient:', error);
    }
  }

  /**
   * Send auto-reject notification to doctor when appointment is cancelled due to not confirming
   */
  async sendAutoRejectEmailToDoctor(
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

      await this.mailerService.sendMail({
        to: doctor.email,
        subject: '⚠️ Lịch hẹn đã bị tự động hủy',
        html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
          <h2 style="color: #f59e0b; margin-bottom: 20px;">⚠️ Lịch hẹn đã bị tự động hủy</h2>

          <p style="font-size: 16px; color: #374151;">Kính gửi <strong>Bác sĩ ${doctor.fullName}</strong>,</p>

          <div style="background-color: #fffbeb; padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b; margin: 20px 0;">
            <p style="margin: 0; color: #92400e;">
              Lịch hẹn <strong>${appointment.startTime}</strong> ngày <strong>${appointmentDate}</strong>
              với bệnh nhân <strong>${patient.fullName}</strong> đã bị tự động hủy do bạn không xác nhận.
            </p>
          </div>

          <div style="background-color: #fef2f2; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; color: #991b1b;">
              <strong>⚠️ Lưu ý:</strong> Các lịch hẹn cần được xác nhận trước ít nhất <strong>30 phút</strong>
              để tránh tự động hủy và đảm bảo trải nghiệm tốt nhất cho bệnh nhân.
            </p>
          </div>

          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
            <p style="margin: 0; color: #6b7280; font-size: 14px;">
              Trân trọng,<br/>
              <strong>Smart Dental Healthcare System</strong>
            </p>
          </div>
        </div>
        `,
      });

      this.logger.log(
        `Sent auto-reject notification to doctor ${doctor.email}`,
      );
    } catch (error) {
      this.logger.error(
        'Failed to send auto-reject notification to doctor:',
        error,
      );
    }
  }
}
