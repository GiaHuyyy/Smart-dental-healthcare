import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { NotificationGateway } from '../notifications/notification.gateway';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userRole?: 'patient' | 'doctor';
}

@WebSocketGateway({
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  namespace: '/appointments',
})
export class AppointmentNotificationGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(AppointmentNotificationGateway.name);
  private connectedUsers: Map<string, string> = new Map(); // userId -> socketId

  constructor(private readonly notificationGateway: NotificationGateway) {}

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const userId = client.handshake.auth.userId;
      const userRole = client.handshake.auth.userRole;

      if (!userId || !userRole) {
        this.logger.warn('Connection rejected: Missing userId or userRole');
        client.disconnect();
        return;
      }

      client.userId = userId;
      client.userRole = userRole as 'patient' | 'doctor';

      // Store connection
      this.connectedUsers.set(userId, client.id);

      // Join user to their personal room
      client.join(`user_${userId}`);

      this.logger.log(
        `User ${userId} (${userRole}) connected to appointment notifications`,
      );
    } catch (error) {
      this.logger.error('Connection error:', error);
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    if (client.userId) {
      this.connectedUsers.delete(client.userId);
      this.logger.log(`User ${client.userId} disconnected from appointments`);
    }
  }

  /**
   * Notify doctor about new appointment
   */
  async notifyDoctorNewAppointment(doctorId: string, appointment: any) {
    // Extract patient name
    const patientName =
      appointment.patientId?.fullName || appointment.patientName || '';

    // Send real-time socket notification
    this.server.to(`user_${doctorId}`).emit('appointment:new', {
      type: 'NEW_APPOINTMENT',
      appointment,
      message: patientName
        ? `Bạn có lịch hẹn mới từ Bệnh nhân ${patientName}`
        : 'Bạn có lịch hẹn mới',
      timestamp: new Date(),
    });

    // Create persistent notification (without socket emit)
    const savedNotification =
      await this.notificationGateway.sendNotificationToUser(
        doctorId,
        {
          title: '📅 Lịch hẹn mới',
          message: patientName
            ? `Bạn có lịch hẹn mới từ Bệnh nhân ${patientName}`
            : 'Bạn có lịch hẹn mới',
          type: 'APPOINTMENT_NEW',
          data: { appointmentId: appointment._id },
          linkTo: `/doctor/schedule?appointmentId=${appointment._id}`,
          icon: '📅',
        },
        false,
      ); // ✅ Pass false to skip socket emit

    // Emit notification:new via this gateway (same socket connection)
    this.server.to(`user_${doctorId}`).emit('notification:new', {
      ...savedNotification.toObject(),
      timestamp: new Date(),
    });

    this.logger.log(`Notified doctor ${doctorId} about new appointment`);
  }

  /**
   * Notify patient about appointment confirmation
   */
  async notifyPatientAppointmentConfirmed(patientId: string, appointment: any) {
    // Extract doctor name
    const doctorName =
      appointment.doctorId?.fullName || appointment.doctorName || '';

    // Send real-time socket notification
    this.server.to(`user_${patientId}`).emit('appointment:confirmed', {
      type: 'APPOINTMENT_CONFIRMED',
      appointment,
      message: doctorName
        ? `Bác sĩ ${doctorName} đã xác nhận lịch hẹn của bạn`
        : 'Bác sĩ đã xác nhận lịch hẹn của bạn',
      timestamp: new Date(),
    });

    // Create persistent notification (without socket emit)
    const savedNotification =
      await this.notificationGateway.sendNotificationToUser(
        patientId,
        {
          title: '✅ Lịch hẹn đã xác nhận',
          message: doctorName
            ? `Bác sĩ ${doctorName} đã xác nhận lịch hẹn của bạn`
            : 'Bác sĩ đã xác nhận lịch hẹn của bạn',
          type: 'APPOINTMENT_CONFIRMED',
          data: { appointmentId: appointment._id },
          linkTo: `/patient/appointments/my-appointments?filter=confirmed&appointmentId=${appointment._id}`,
          icon: '✅',
        },
        false,
      );

    // Emit notification:new via this gateway
    this.server.to(`user_${patientId}`).emit('notification:new', {
      ...savedNotification.toObject(),
      timestamp: new Date(),
    });

    this.logger.log(`Notified patient ${patientId} about confirmation`);
  }

  /**
   * Notify about appointment cancellation (ENHANCED with billing info)
   */
  async notifyAppointmentCancelled(
    userId: string,
    appointment: any,
    cancelledBy: 'doctor' | 'patient' | 'system',
    feeCharged = false,
    voucherCreated = false,
  ) {
    // Extract names based on who is receiving the notification
    const doctorName =
      appointment.doctorId?.fullName || appointment.doctorName || '';
    const patientName =
      appointment.patientId?.fullName || appointment.patientName || '';

    let message = '';

    // Build message based on who cancelled and who is receiving
    if (cancelledBy === 'system') {
      message = 'Hệ thống đã tự động hủy lịch hẹn do bác sĩ không kịp xác nhận';
    } else if (cancelledBy === 'doctor') {
      // If doctor cancelled, the notification goes to patient
      message = doctorName
        ? `Bác sĩ ${doctorName} đã hủy lịch hẹn`
        : 'Bác sĩ đã hủy lịch hẹn';
    } else {
      // If patient cancelled, the notification goes to doctor
      message = patientName
        ? `Bệnh nhân ${patientName} đã hủy lịch hẹn`
        : 'Bệnh nhân đã hủy lịch hẹn';
    }

    if (feeCharged) {
      message += '. Phí đặt chỗ 50,000 VND được áp dụng';
    }
    if (voucherCreated) {
      message += '. Bạn đã nhận voucher giảm giá 5%';
    }

    // Send real-time socket notification
    this.server.to(`user_${userId}`).emit('appointment:cancelled', {
      type: 'APPOINTMENT_CANCELLED',
      appointment,
      cancelledBy,
      feeCharged,
      voucherCreated,
      message,
      timestamp: new Date(),
    });

    // Create persistent notification (without socket emit)
    const savedNotification =
      await this.notificationGateway.sendNotificationToUser(
        userId,
        {
          title:
            cancelledBy === 'system'
              ? '⚠️ Hệ thống hủy lịch hẹn'
              : '❌ Lịch hẹn đã bị hủy',
          message,
          type: 'APPOINTMENT_CANCELLED',
          data: {
            appointmentId: appointment._id,
            cancelledBy,
            feeCharged,
            voucherCreated,
          },
          linkTo:
            cancelledBy === 'patient'
              ? `/doctor/schedule?appointmentId=${appointment._id}`
              : `/patient/appointments/my-appointments?filter=cancelled&appointmentId=${appointment._id}`,
          icon: cancelledBy === 'system' ? '⚠️' : '❌',
        },
        false,
      );

    // Emit notification:new via this gateway
    this.server.to(`user_${userId}`).emit('notification:new', {
      ...savedNotification.toObject(),
      timestamp: new Date(),
    });

    this.logger.log(`Notified user ${userId} about cancellation`);
  }

  /**
   * Notify about appointment reschedule (ENHANCED with fee info)
   * Note: Only patients can reschedule, so this only notifies doctors
   */
  async notifyAppointmentRescheduled(
    userId: string,
    appointment: any,
    userRole: 'doctor' | 'patient' = 'patient',
    feeCharged = false,
  ) {
    // Extract names based on who is receiving the notification
    const doctorName =
      appointment.doctorId?.fullName || appointment.doctorName || '';
    const patientName =
      appointment.patientId?.fullName || appointment.patientName || '';

    let message = '';

    if (userRole === 'doctor') {
      // Notification for doctor (patient rescheduled)
      message = patientName
        ? `Bệnh nhân ${patientName} đã dời lịch hẹn sang thời gian khác`
        : 'Bệnh nhân đã dời lịch hẹn sang thời gian khác';
    } else {
      // This shouldn't happen since only patients can reschedule
      // But keep for backward compatibility
      message = doctorName
        ? `Bác sĩ ${doctorName} đã dời lịch hẹn của bạn sang thời gian khác`
        : 'Bác sĩ đã dời lịch hẹn của bạn sang thời gian khác';
    }

    if (feeCharged) {
      message +=
        '. Phí đặt chỗ 50,000 VND được áp dụng do đổi lịch trong vòng 30 phút';
    }

    // Send real-time socket notification
    this.server.to(`user_${userId}`).emit('appointment:rescheduled', {
      type: 'APPOINTMENT_RESCHEDULED',
      appointment,
      feeCharged,
      message,
      timestamp: new Date(),
    });

    // Create persistent notification (without socket emit)
    const savedNotification =
      await this.notificationGateway.sendNotificationToUser(
        userId,
        {
          title: '🔄 Lịch hẹn đã được dời',
          message,
          type: 'APPOINTMENT_RESCHEDULED',
          data: { appointmentId: appointment._id, feeCharged },
          linkTo:
            userRole === 'doctor'
              ? `/doctor/schedule?appointmentId=${appointment._id}`
              : `/patient/appointments/my-appointments?filter=confirmed&appointmentId=${appointment._id}`,
          icon: '🔄',
        },
        false,
      );

    // Emit notification:new via this gateway
    this.server.to(`user_${userId}`).emit('notification:new', {
      ...savedNotification.toObject(),
      timestamp: new Date(),
    });

    this.logger.log(`Notified user ${userId} about reschedule`);
  }

  /**
   * Notify patient about appointment completion
   */
  async notifyAppointmentCompleted(patientId: string, appointment: any) {
    // Extract doctor name
    const doctorName =
      appointment.doctorId?.fullName || appointment.doctorName || '';

    // Send real-time socket notification
    this.server.to(`user_${patientId}`).emit('appointment:completed', {
      type: 'APPOINTMENT_COMPLETED',
      appointment,
      message: doctorName
        ? `Lịch khám với Bác sĩ ${doctorName} đã hoàn tất`
        : 'Lịch khám đã hoàn tất',
      timestamp: new Date(),
    });

    // Create persistent notification (without socket emit)
    const savedNotification =
      await this.notificationGateway.sendNotificationToUser(
        patientId,
        {
          title: '✅ Lịch khám hoàn tất',
          message: doctorName
            ? `Lịch khám với Bác sĩ ${doctorName} đã hoàn tất. Bạn có thể xem hồ sơ bệnh án.`
            : 'Lịch khám đã hoàn tất. Bạn có thể xem hồ sơ bệnh án.',
          type: 'APPOINTMENT_COMPLETED',
          data: { appointmentId: appointment._id },
          linkTo: '/patient/record',
          icon: '✅',
        },
        false,
      );

    // Emit notification:new via this gateway
    this.server.to(`user_${patientId}`).emit('notification:new', {
      ...savedNotification.toObject(),
      timestamp: new Date(),
    });

    this.logger.log(`Notified patient ${patientId} about completion`);
  }

  /**
   * Send appointment reminder (30 minutes before)
   */
  async sendAppointmentReminder(userId: string, reminderData: any) {
    // Extract names
    const doctorName =
      reminderData.appointment?.doctorId?.fullName ||
      reminderData.appointment?.doctorName ||
      'Bác sĩ';
    const patientName =
      reminderData.appointment?.patientId?.fullName ||
      reminderData.appointment?.patientName ||
      'Bệnh nhân';

    // Determine message based on user role
    let message = reminderData.message;
    if (!message) {
      if (reminderData.userRole === 'doctor') {
        message = `Lịch hẹn với ${patientName} sắp bắt đầu trong 30 phút`;
      } else {
        message = `Lịch hẹn với ${doctorName} sắp bắt đầu trong 30 phút`;
      }
    }

    // Send real-time socket notification
    this.server.to(`user_${userId}`).emit('appointment:reminder', {
      type: 'APPOINTMENT_REMINDER',
      ...reminderData,
      message,
      timestamp: new Date(),
    });

    // Create persistent notification (without socket emit)
    const savedNotification =
      await this.notificationGateway.sendNotificationToUser(
        userId,
        {
          title: '⏰ Nhắc nhở lịch hẹn',
          message,
          type: 'APPOINTMENT_REMINDER',
          data: { appointmentId: reminderData.appointmentId },
          linkTo: reminderData.linkTo,
          icon: '⏰',
        },
        false,
      );

    // Emit notification:new via this gateway
    this.server.to(`user_${userId}`).emit('notification:new', {
      ...savedNotification.toObject(),
      timestamp: new Date(),
    });

    this.logger.log(`Sent reminder to user ${userId}`);
  }

  /**
   * Notify follow-up suggestion
   */
  async notifyFollowUpSuggestion(appointment: any) {
    const patientId = appointment.patientId?._id || appointment.patientId;
    const doctorName =
      appointment.doctorId?.fullName || appointment.doctorName || '';

    this.server.to(`user_${patientId}`).emit('appointment:followup', {
      type: 'FOLLOW_UP_SUGGESTION',
      appointment,
      message: doctorName
        ? `Bác sĩ ${doctorName} đề xuất lịch tái khám với giảm giá 5%`
        : 'Bác sĩ đề xuất lịch tái khám với giảm giá 5%',
      timestamp: new Date(),
    });

    await this.notificationGateway.sendNotificationToUser(
      String(patientId),
      {
        title: '🔔 Đề xuất tái khám',
        message: doctorName
          ? `Bác sĩ ${doctorName} đã đề xuất lịch tái khám cho bạn với ưu đãi giảm giá 5%`
          : 'Bác sĩ đã đề xuất lịch tái khám cho bạn với ưu đãi giảm giá 5%',
        type: 'FOLLOW_UP_SUGGESTION',
        data: { appointmentId: appointment._id },
        linkTo: '/patient/appointments/my-appointments?filter=follow-up',
        icon: '🔔',
      },
      false,
    );
  }

  /**
   * Notify doctor when patient confirms follow-up
   */
  async notifyFollowUpConfirmed(doctorId: string, appointment: any) {
    const patientName =
      appointment.patientId?.fullName || appointment.patientName || '';

    this.server.to(`user_${doctorId}`).emit('appointment:followup-confirmed', {
      type: 'FOLLOW_UP_CONFIRMED',
      appointment,
      message: patientName
        ? `Bệnh nhân ${patientName} đã xác nhận lịch tái khám`
        : 'Bệnh nhân đã xác nhận lịch tái khám',
      timestamp: new Date(),
    });

    await this.notificationGateway.sendNotificationToUser(
      doctorId,
      {
        title: '✅ Xác nhận lịch tái khám',
        message: patientName
          ? `Bệnh nhân ${patientName} đã xác nhận lịch tái khám`
          : 'Bệnh nhân đã xác nhận lịch tái khám',
        type: 'FOLLOW_UP_CONFIRMED',
        data: { appointmentId: appointment._id },
        linkTo: '/doctor/schedule?openFollowUpModal=true',
        icon: '✅',
      },
      false,
    );
  }

  /**
   * Notify doctor when patient rejects follow-up
   */
  async notifyFollowUpRejected(doctorId: string, appointment: any) {
    const patientName =
      appointment.patientId?.fullName || appointment.patientName || '';

    this.server.to(`user_${doctorId}`).emit('appointment:followup-rejected', {
      type: 'FOLLOW_UP_REJECTED',
      appointment,
      message: patientName
        ? `Bệnh nhân ${patientName} đã từ chối lịch tái khám`
        : 'Bệnh nhân đã từ chối lịch tái khám',
      timestamp: new Date(),
    });

    await this.notificationGateway.sendNotificationToUser(
      doctorId,
      {
        title: '❌ Từ chối lịch tái khám',
        message: patientName
          ? `Bệnh nhân ${patientName} đã từ chối lịch tái khám`
          : 'Bệnh nhân đã từ chối lịch tái khám',
        type: 'FOLLOW_UP_REJECTED',
        data: { appointmentId: appointment._id },
        linkTo: '/doctor/schedule?openFollowUpModal=true',
        icon: '❌',
      },
      false,
    );
  }

  /**
   * Notify patient about new follow-up suggestion from doctor
   * Used to trigger UI refresh of follow-up count
   */
  notifyFollowUpSuggestionCreated(patientId: string, suggestion: any) {
    this.logger.log(`Emitting followup:new to patient ${patientId}`);
    this.server.to(`user_${patientId}`).emit('followup:new', {
      type: 'FOLLOW_UP_SUGGESTION_NEW',
      suggestion,
      timestamp: new Date(),
    });
  }

  /**
   * Notify patient when follow-up suggestion is scheduled/accepted
   * Used to trigger UI refresh of follow-up count
   */
  notifyFollowUpScheduled(patientId: string, suggestionId: string) {
    this.logger.log(`Emitting followup:scheduled to patient ${patientId}`);
    this.server.to(`user_${patientId}`).emit('followup:scheduled', {
      type: 'FOLLOW_UP_SCHEDULED',
      suggestionId,
      timestamp: new Date(),
    });
  }

  /**
   * Notify patient when follow-up suggestion is declined
   * Used to trigger UI refresh of follow-up count
   */
  notifyFollowUpDeclined(patientId: string, suggestionId: string) {
    this.logger.log(`Emitting followup:declined to patient ${patientId}`);
    this.server.to(`user_${patientId}`).emit('followup:declined', {
      type: 'FOLLOW_UP_DECLINED',
      suggestionId,
      timestamp: new Date(),
    });
  }

  /**
   * Check if user is online
   */
  isUserOnline(userId: string): boolean {
    return this.connectedUsers.has(userId);
  }
}
