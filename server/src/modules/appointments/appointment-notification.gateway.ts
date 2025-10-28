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
    // Send real-time socket notification
    this.server.to(`user_${doctorId}`).emit('appointment:new', {
      type: 'NEW_APPOINTMENT',
      appointment,
      message: 'Bạn có lịch hẹn mới',
      timestamp: new Date(),
    });

    // Create persistent notification (without socket emit)
    const savedNotification =
      await this.notificationGateway.sendNotificationToUser(
        doctorId,
        {
          title: '📅 Lịch hẹn mới',
          message: `Bạn có lịch hẹn mới từ bệnh nhân ${appointment.patientName || 'N/A'}`,
          type: 'APPOINTMENT_NEW',
          data: { appointmentId: appointment._id },
          linkTo: '/doctor/schedule',
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
    // Send real-time socket notification
    this.server.to(`user_${patientId}`).emit('appointment:confirmed', {
      type: 'APPOINTMENT_CONFIRMED',
      appointment,
      message: 'Lịch hẹn của bạn đã được xác nhận',
      timestamp: new Date(),
    });

    // Create persistent notification (without socket emit)
    const savedNotification =
      await this.notificationGateway.sendNotificationToUser(
        patientId,
        {
          title: '✅ Lịch hẹn đã xác nhận',
          message: `Bác sĩ ${appointment.doctorName || 'N/A'} đã xác nhận lịch hẹn của bạn`,
          type: 'APPOINTMENT_CONFIRMED',
          data: { appointmentId: appointment._id },
          linkTo: '/patient/appointments/my-appointments',
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
   * Notify about appointment cancellation
   */
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
    let message = '';

    // Build message based on who cancelled
    if (cancelledBy === 'system') {
      message = 'Hệ thống đã tự động hủy lịch hẹn do bác sĩ không kịp xác nhận';
    } else if (cancelledBy === 'doctor') {
      message = 'Bác sĩ đã hủy lịch hẹn';
    } else {
      message = 'Bệnh nhân đã hủy lịch hẹn';
    }

    if (feeCharged) {
      message += '. Phí đặt chỗ 100,000 VND được áp dụng';
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
              ? '/doctor/schedule'
              : '/patient/appointments/my-appointments',
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
   */
  async notifyAppointmentRescheduled(
    userId: string,
    appointment: any,
    userRole: 'doctor' | 'patient' = 'patient',
    feeCharged = false,
  ) {
    let message = 'Lịch hẹn đã được dời sang thời gian khác';
    if (feeCharged) {
      message +=
        '. Phí đặt chỗ 100,000 VND được áp dụng do đổi lịch trong vòng 30 phút';
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
              ? '/doctor/schedule'
              : '/patient/appointments/my-appointments',
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
    // Send real-time socket notification
    this.server.to(`user_${patientId}`).emit('appointment:completed', {
      type: 'APPOINTMENT_COMPLETED',
      appointment,
      message: 'Lịch khám đã hoàn tất',
      timestamp: new Date(),
    });

    // Create persistent notification (without socket emit)
    const savedNotification =
      await this.notificationGateway.sendNotificationToUser(
        patientId,
        {
          title: '✅ Lịch khám hoàn tất',
          message: 'Lịch khám đã hoàn tất. Bạn có thể xem hồ sơ bệnh án.',
          type: 'APPOINTMENT_COMPLETED',
          data: { appointmentId: appointment._id },
          linkTo: '/patient/medical-records',
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
    // Send real-time socket notification
    this.server.to(`user_${userId}`).emit('appointment:reminder', {
      type: 'APPOINTMENT_REMINDER',
      ...reminderData,
      timestamp: new Date(),
    });

    // Create persistent notification (without socket emit)
    const savedNotification =
      await this.notificationGateway.sendNotificationToUser(
        userId,
        {
          title: '⏰ Nhắc nhở lịch hẹn',
          message:
            reminderData.message ||
            'Lịch hẹn của bạn sắp bắt đầu trong 30 phút',
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

    this.server.to(`user_${patientId}`).emit('appointment:followup', {
      type: 'FOLLOW_UP_SUGGESTION',
      appointment,
      message: 'Bác sĩ đề xuất lịch tái khám với giảm giá 5%',
      timestamp: new Date(),
    });

    await this.notificationGateway.sendNotificationToUser(
      String(patientId),
      {
        title: '🔔 Đề xuất tái khám',
        message:
          'Bác sĩ đã đề xuất lịch tái khám cho bạn với ưu đãi giảm giá 5%',
        type: 'FOLLOW_UP_SUGGESTION',
        data: { appointmentId: appointment._id },
        linkTo: '/patient/appointments?tab=follow-ups',
        icon: '🔔',
      },
      false,
    );
  }

  /**
   * Notify doctor when patient confirms follow-up
   */
  async notifyFollowUpConfirmed(doctorId: string, appointment: any) {
    this.server.to(`user_${doctorId}`).emit('appointment:followup-confirmed', {
      type: 'FOLLOW_UP_CONFIRMED',
      appointment,
      message: 'Bệnh nhân đã xác nhận lịch tái khám',
      timestamp: new Date(),
    });

    await this.notificationGateway.sendNotificationToUser(
      doctorId,
      {
        title: '✅ Xác nhận lịch tái khám',
        message: `Bệnh nhân ${appointment.patientId?.fullName || 'đã xác nhận'} lịch tái khám`,
        type: 'FOLLOW_UP_CONFIRMED',
        data: { appointmentId: appointment._id },
        linkTo: '/doctor/schedule',
        icon: '✅',
      },
      false,
    );
  }

  /**
   * Notify doctor when patient rejects follow-up
   */
  async notifyFollowUpRejected(doctorId: string, appointment: any) {
    this.server.to(`user_${doctorId}`).emit('appointment:followup-rejected', {
      type: 'FOLLOW_UP_REJECTED',
      appointment,
      message: 'Bệnh nhân đã từ chối lịch tái khám',
      timestamp: new Date(),
    });

    await this.notificationGateway.sendNotificationToUser(
      doctorId,
      {
        title: '❌ Từ chối lịch tái khám',
        message: `Bệnh nhân ${appointment.patientId?.fullName || 'đã từ chối'} lịch tái khám`,
        type: 'FOLLOW_UP_REJECTED',
        data: { appointmentId: appointment._id },
        linkTo: '/doctor/schedule',
        icon: '❌',
      },
      false,
    );
  }

  /**
   * Check if user is online
   */
  isUserOnline(userId: string): boolean {
    return this.connectedUsers.has(userId);
  }
}
