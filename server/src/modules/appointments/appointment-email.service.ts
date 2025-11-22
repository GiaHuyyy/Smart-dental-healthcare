import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class AppointmentEmailService {
  private readonly logger = new Logger(AppointmentEmailService.name);

  constructor(
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService,
  ) {}

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

      const viewUrl = `${this.configService.get<string>('CLIENT_URL') || 'http://localhost:3000'}/doctor/schedule?appointmentId=${appointment._id}`;

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
          ? `${this.configService.get<string>('CLIENT_URL') || 'http://localhost:3000'}/patient/appointments/my-appointments`
          : `${this.configService.get<string>('CLIENT_URL') || 'http://localhost:3000'}/doctor/schedule`;

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
          ? `${this.configService.get<string>('CLIENT_URL') || 'http://localhost:3000'}/doctor/schedule`
          : `${this.configService.get<string>('CLIENT_URL') || 'http://localhost:3000'}/patient/appointments/my-appointments`;

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

  /**
   * Send follow-up suggestion email to patient
   */
  async sendFollowUpSuggestionEmail(
    patient: any,
    doctor: any,
    suggestion: any,
  ) {
    try {
      const clientUrl =
        this.configService.get<string>('CLIENT_URL') || 'http://localhost:3000';
      const viewUrl = `${clientUrl}/patient/appointments?tab=follow-ups`;

      const voucherInfo = suggestion.voucherId
        ? `
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 20px; border-radius: 12px; margin: 20px 0;">
          <p style="margin: 0 0 10px 0; color: white; font-size: 18px; font-weight: bold;">
            🎁 Ưu đãi đặc biệt cho bạn!
          </p>
          <p style="margin: 0; color: white; font-size: 24px; font-weight: bold;">
            GIẢM ${suggestion.voucherId.discountPercentage || suggestion.voucherId.value}%
          </p>
          <p style="margin: 10px 0 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">
            Mã voucher: <strong>${suggestion.voucherId.code}</strong>
          </p>
        </div>
        `
        : '';

      await this.mailerService.sendMail({
        to: patient.email,
        subject: '🔔 Đề xuất tái khám từ bác sĩ',
        html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <!-- Header with gradient -->
          <div style="background: linear-gradient(135deg, #3b82f6 0%, #6366f1 100%); padding: 30px 20px; text-align: center;">
            <h1 style="margin: 0; color: white; font-size: 28px; font-weight: bold;">
              🏥 Smart Dental Healthcare
            </h1>
            <p style="margin: 10px 0 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">
              Đề xuất tái khám từ bác sĩ
            </p>
          </div>

          <!-- Content -->
          <div style="padding: 30px 20px;">
            <p style="margin: 0 0 20px 0; color: #111827; font-size: 16px;">
              Xin chào <strong>${patient.fullName}</strong>,
            </p>

            <div style="background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); padding: 20px; border-radius: 12px; border-left: 4px solid #3b82f6; margin: 20px 0;">
              <p style="margin: 0 0 10px 0; color: #1e40af; font-weight: bold;">
                Bác sĩ ${doctor.fullName} đã đề xuất lịch tái khám cho bạn
              </p>
              ${
                suggestion.notes
                  ? `
              <p style="margin: 10px 0 0 0; color: #1e3a8a; font-style: italic;">
                "${suggestion.notes}"
              </p>
              `
                  : ''
              }
            </div>

            ${voucherInfo}

            <div style="background: #f9fafb; padding: 20px; border-radius: 12px; margin: 20px 0;">
              <p style="margin: 0 0 15px 0; color: #374151; font-size: 15px;">
                <strong>📋 Hướng dẫn đặt lịch:</strong>
              </p>
              <ol style="margin: 0; padding-left: 20px; color: #4b5563;">
                <li style="margin-bottom: 8px;">Đăng nhập vào tài khoản của bạn</li>
                <li style="margin-bottom: 8px;">Vào mục "Lịch tái khám"</li>
                <li style="margin-bottom: 8px;">Chọn "Đặt lịch ngay" để chọn ngày giờ phù hợp</li>
                <li style="margin-bottom: 0;">Voucher giảm giá sẽ tự động được áp dụng</li>
              </ol>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${viewUrl}" style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #6366f1 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 6px rgba(59, 130, 246, 0.3);">
                Đặt lịch tái khám ngay
              </a>
            </div>

            <div style="background: #fef3c7; border: 1px solid #fbbf24; border-radius: 8px; padding: 15px; margin: 20px 0;">
              <p style="margin: 0; color: #92400e; font-size: 14px;">
                <strong>💡 Lưu ý:</strong> Đề xuất này có thời hạn. Vui lòng đặt lịch sớm để không bỏ lỡ ưu đãi!
              </p>
            </div>
          </div>

          <!-- Footer -->
          <div style="background: #f3f4f6; padding: 20px; border-top: 1px solid #e5e7eb;">
            <p style="margin: 0; color: #6b7280; font-size: 14px; text-align: center;">
              Trân trọng,<br/>
              <strong>Smart Dental Healthcare System</strong>
            </p>
            <p style="margin: 15px 0 0 0; color: #9ca3af; font-size: 12px; text-align: center;">
              Email này được gửi tự động. Vui lòng không trả lời email này.
            </p>
          </div>
        </div>
        `,
      });

      this.logger.log(
        `Sent follow-up suggestion email to patient ${patient.email}`,
      );
    } catch (error) {
      this.logger.error('Failed to send follow-up suggestion email:', error);
    }
  }

  /**
   * Send email to doctor when patient rejects follow-up suggestion
   */
  async sendFollowUpRejectedEmail(doctor: any, patient: any, suggestion: any) {
    try {
      const clientUrl =
        this.configService.get<string>('CLIENT_URL') || 'http://localhost:3000';
      const scheduleUrl = `${clientUrl}/doctor/schedule`;

      await this.mailerService.sendMail({
        to: doctor.email,
        subject: '❌ Bệnh nhân từ chối lịch tái khám',
        html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 30px 20px; text-align: center;">
            <h1 style="margin: 0; color: white; font-size: 28px; font-weight: bold;">
              🏥 Smart Dental Healthcare
            </h1>
            <p style="margin: 10px 0 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">
              Thông báo từ chối lịch tái khám
            </p>
          </div>

          <!-- Content -->
          <div style="padding: 30px 20px;">
            <p style="margin: 0 0 20px 0; color: #111827; font-size: 16px;">
              Xin chào <strong>Bác sĩ ${doctor.fullName}</strong>,
            </p>

            <div style="background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%); padding: 20px; border-radius: 12px; border-left: 4px solid #ef4444; margin: 20px 0;">
              <p style="margin: 0 0 10px 0; color: #991b1b; font-weight: bold;">
                ❌ Bệnh nhân <strong>${patient.fullName}</strong> đã từ chối đề xuất tái khám của bạn
              </p>
              ${
                suggestion.notes
                  ? `
              <p style="margin: 10px 0 0 0; color: #7f1d1d; font-style: italic;">
                Ghi chú của bạn: "${suggestion.notes}"
              </p>
              `
                  : ''
              }
            </div>

            <div style="background: #f9fafb; padding: 20px; border-radius: 12px; margin: 20px 0;">
              <p style="margin: 0 0 15px 0; color: #374151; font-size: 15px;">
                <strong>📋 Thông tin bệnh nhân:</strong>
              </p>
              <table style="width: 100%; color: #4b5563; font-size: 14px;">
                <tr>
                  <td style="padding: 8px 0; width: 40%;"><strong>Họ tên:</strong></td>
                  <td style="padding: 8px 0;">${patient.fullName}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0;"><strong>Email:</strong></td>
                  <td style="padding: 8px 0;">${patient.email}</td>
                </tr>
                ${
                  patient.phone
                    ? `
                <tr>
                  <td style="padding: 8px 0;"><strong>Số điện thoại:</strong></td>
                  <td style="padding: 8px 0;">${patient.phone}</td>
                </tr>
                `
                    : ''
                }
              </table>
            </div>

            <div style="background: #fef3c7; border: 1px solid #fbbf24; border-radius: 8px; padding: 15px; margin: 20px 0;">
              <p style="margin: 0; color: #92400e; font-size: 14px;">
                <strong>💡 Gợi ý:</strong> Bạn có thể liên hệ trực tiếp với bệnh nhân để tìm hiểu lý do hoặc đề xuất một lịch khác phù hợp hơn.
              </p>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${scheduleUrl}" style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #6366f1 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 6px rgba(59, 130, 246, 0.3);">
                Xem lịch làm việc
              </a>
            </div>
          </div>

          <!-- Footer -->
          <div style="background: #f3f4f6; padding: 20px; border-top: 1px solid #e5e7eb;">
            <p style="margin: 0; color: #6b7280; font-size: 14px; text-align: center;">
              Trân trọng,<br/>
              <strong>Smart Dental Healthcare System</strong>
            </p>
            <p style="margin: 15px 0 0 0; color: #9ca3af; font-size: 12px; text-align: center;">
              Email này được gửi tự động. Vui lòng không trả lời email này.
            </p>
          </div>
        </div>
        `,
      });

      this.logger.log(
        `Sent follow-up rejection email to doctor ${doctor.email}`,
      );
    } catch (error) {
      this.logger.error('Failed to send follow-up rejection email:', error);
    }
  }
}
