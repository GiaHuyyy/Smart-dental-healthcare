import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AppointmentEmailService } from './appointment-email.service';
import { AppointmentNotificationGateway } from './appointment-notification.gateway';
import { VouchersService } from '../vouchers/vouchers.service';
import { BillingHelperService } from '../payments/billing-helper.service';

@Injectable()
export class AppointmentReminderService {
  private readonly logger = new Logger(AppointmentReminderService.name);
  private sentReminders = new Set<string>(); // Track sent reminders to avoid duplicates

  constructor(
    @InjectModel('Appointment') private appointmentModel: Model<any>,
    @InjectModel('Payment') private paymentModel: Model<any>,
    private readonly emailService: AppointmentEmailService,
    private readonly appointmentGateway: AppointmentNotificationGateway,
    private readonly vouchersService: VouchersService,
    private readonly billingService: BillingHelperService,
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

  /**
   * Cron job chạy mỗi 5 phút để tự động hủy các lịch "Chờ xác nhận" khi còn ≤30 phút
   * - Đổi status sang 'cancelled'
   * - Gửi email cho bệnh nhân
   * - Gửi thông báo cho bác sĩ
   * - Tạo voucher 5% cho bệnh nhân
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async autoRejectPendingAppointments() {
    this.logger.log('Checking for pending appointments to auto-reject...');

    try {
      const now = new Date();

      // Tìm TẤT CẢ các appointment đang ở trạng thái 'pending'
      // (bao gồm cả quá khứ và hiện tại)
      const pendingAppointments = await this.appointmentModel
        .find({
          status: 'pending',
        })
        .populate('doctorId', 'fullName email phone')
        .populate('patientId', 'fullName email phone')
        .exec();

      this.logger.log(
        `Found ${pendingAppointments.length} pending appointments to check`,
      );

      for (const appointment of pendingAppointments) {
        const appointmentDateTime = this.getAppointmentDateTime(appointment);
        const minutesUntilAppointment = Math.floor(
          (appointmentDateTime.getTime() - now.getTime()) / (1000 * 60),
        );

        // Hủy nếu:
        // 1. Thời gian đã qua (minutesUntilAppointment < 0) - lịch trong quá khứ
        // 2. Còn ≤30 phút (minutesUntilAppointment <= 30)
        if (minutesUntilAppointment <= 30) {
          this.logger.log(
            `Auto-rejecting appointment ${appointment._id} (${minutesUntilAppointment} minutes ${minutesUntilAppointment < 0 ? 'overdue' : 'left'})`,
          );

          try {
            await this.rejectPendingAppointment(appointment);
          } catch (error) {
            this.logger.error(
              `Failed to auto-reject appointment ${appointment._id}:`,
              error,
            );
          }
        }
      }
    } catch (error) {
      this.logger.error('Error in autoRejectPendingAppointments:', error);
    }
  }

  /**
   * Xử lý hủy một appointment pending
   */
  private async rejectPendingAppointment(appointment: any) {
    const { patientId, doctorId } = appointment;

    // 1. Cập nhật status thành 'cancelled'
    appointment.status = 'cancelled';
    appointment.cancelledBy = 'system';
    appointment.cancelReason = 'Bác sĩ không kịp xác nhận';
    appointment.cancelledAt = new Date();
    await appointment.save();

    this.logger.log(
      `Appointment ${appointment._id} marked as cancelled (auto-reject)`,
    );

    // 2. Tạo voucher 5% cho bệnh nhân (tương tự như khi bác sĩ hủy)
    try {
      await this.vouchersService.createDoctorCancellationVoucher(
        patientId._id.toString(),
        appointment._id.toString(),
      );

      this.logger.log(
        `Voucher created for patient ${patientId._id} (auto-reject)`,
      );
    } catch (error) {
      this.logger.error('Failed to create voucher:', error);
    }

    // 2.5. Kiểm tra và hoàn tiền 100% nếu đã thanh toán
    let refundIssued = false;
    let refundAmount = 0;
    try {
      // Tìm payment đã thanh toán cho appointment này
      const existingPayment = await this.paymentModel.findOne({
        refId: appointment._id.toString(),
        refModel: 'Appointment',
        type: 'appointment',
        status: 'completed',
      });

      if (existingPayment) {
        // Tạo bill hoàn tiền 100%
        await this.billingService.refundConsultationFee(
          existingPayment._id.toString(),
          existingPayment.amount,
          patientId._id.toString(),
          doctorId._id.toString(),
          appointment._id.toString(),
        );

        refundIssued = true;
        refundAmount = existingPayment.amount;
        this.logger.log(
          `Refunded ${existingPayment.amount} VND to patient ${patientId._id} for appointment ${appointment._id}`,
        );
      } else {
        this.logger.log(
          `No payment found for appointment ${appointment._id}, skip refund`,
        );
      }
    } catch (error) {
      this.logger.error('Failed to process refund:', error);
    }

    // 3. Gửi email cho bệnh nhân
    try {
      await this.emailService.sendAutoRejectEmailToPatient(
        appointment,
        patientId,
        doctorId,
        refundIssued,
        refundAmount,
      );

      this.logger.log(`Auto-reject email sent to patient ${patientId.email}`);
    } catch (error) {
      this.logger.error('Failed to send email to patient:', error);
    }

    // 4. Gửi thông báo cho bác sĩ
    try {
      await this.emailService.sendAutoRejectEmailToDoctor(
        appointment,
        doctorId,
        patientId,
      );

      this.logger.log(
        `Auto-reject notification sent to doctor ${doctorId.email}`,
      );
    } catch (error) {
      this.logger.error('Failed to send email to doctor:', error);
    }

    // 5. Gửi realtime notification qua Socket
    try {
      // Thông báo cho bệnh nhân - hệ thống tự động hủy do bác sĩ không xác nhận
      await this.appointmentGateway.notifyAppointmentCancelled(
        patientId._id.toString(),
        appointment,
        'system', // Rõ ràng là hệ thống tự động hủy
        false, // Không tính phí cho bệnh nhân
        true, // Có tạo voucher
      );

      // Thông báo cho bác sĩ
      await this.appointmentGateway.notifyAppointmentCancelled(
        doctorId._id.toString(),
        appointment,
        'system', // Rõ ràng là hệ thống tự động hủy
        false,
        false,
      );

      this.logger.log('Realtime notifications sent via socket');
    } catch (error) {
      this.logger.error('Failed to send socket notifications:', error);
    }
  }
}
