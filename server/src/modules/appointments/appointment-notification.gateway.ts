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
    const savedNotification = await this.notificationGateway.sendNotificationToUser(doctorId, {
      title: '📅 Lịch hẹn mới',
      message: `Bạn có lịch hẹn mới từ bệnh nhân ${appointment.patientName || 'N/A'}`,
      type: 'APPOINTMENT_NEW',
      data: { appointmentId: appointment._id },
      linkTo: '/doctor/schedule',
      icon: '📅',
    }, false); // ✅ Pass false to skip socket emit

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
    const savedNotification = await this.notificationGateway.sendNotificationToUser(patientId, {
      title: '✅ Lịch hẹn đã xác nhận',
      message: `Bác sĩ ${appointment.doctorName || 'N/A'} đã xác nhận lịch hẹn của bạn`,
      type: 'APPOINTMENT_CONFIRMED',
      data: { appointmentId: appointment._id },
      linkTo: '/patient/appointments/my-appointments',
      icon: '✅',
    }, false);

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
  async notifyAppointmentCancelled(
    userId: string,
    appointment: any,
    cancelledBy: 'doctor' | 'patient',
  ) {
    const message =
      cancelledBy === 'doctor'
        ? 'Bác sĩ đã hủy lịch hẹn'
        : 'Bệnh nhân đã hủy lịch hẹn';

    // Send real-time socket notification
    this.server.to(`user_${userId}`).emit('appointment:cancelled', {
      type: 'APPOINTMENT_CANCELLED',
      appointment,
      cancelledBy,
      message,
      timestamp: new Date(),
    });

    // Create persistent notification (without socket emit)
    const savedNotification = await this.notificationGateway.sendNotificationToUser(userId, {
      title: '❌ Lịch hẹn đã bị hủy',
      message,
      type: 'APPOINTMENT_CANCELLED',
      data: { appointmentId: appointment._id, cancelledBy },
      linkTo:
        cancelledBy === 'doctor'
          ? '/patient/appointments/my-appointments'
          : '/doctor/schedule',
      icon: '❌',
    }, false);

    // Emit notification:new via this gateway
    this.server.to(`user_${userId}`).emit('notification:new', {
      ...savedNotification.toObject(),
      timestamp: new Date(),
    });

    this.logger.log(`Notified user ${userId} about cancellation`);
  }

  /**
   * Notify about appointment reschedule
   */
  async notifyAppointmentRescheduled(userId: string, appointment: any) {
    // Send real-time socket notification
    this.server.to(`user_${userId}`).emit('appointment:rescheduled', {
      type: 'APPOINTMENT_RESCHEDULED',
      appointment,
      message: 'Lịch hẹn đã được dời sang thời gian khác',
      timestamp: new Date(),
    });

    // Create persistent notification (without socket emit)
    const savedNotification = await this.notificationGateway.sendNotificationToUser(userId, {
      title: '🔄 Lịch hẹn đã được dời',
      message: 'Lịch hẹn đã được dời sang thời gian khác',
      type: 'APPOINTMENT_RESCHEDULED',
      data: { appointmentId: appointment._id },
      linkTo: '/patient/appointments/my-appointments',
      icon: '🔄',
    }, false);

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
    const savedNotification = await this.notificationGateway.sendNotificationToUser(patientId, {
      title: '✅ Lịch khám hoàn tất',
      message: 'Lịch khám đã hoàn tất. Bạn có thể xem hồ sơ bệnh án.',
      type: 'APPOINTMENT_COMPLETED',
      data: { appointmentId: appointment._id },
      linkTo: '/patient/medical-records',
      icon: '✅',
    }, false);

    // Emit notification:new via this gateway
    this.server.to(`user_${patientId}`).emit('notification:new', {
      ...savedNotification.toObject(),
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
    const savedNotification = await this.notificationGateway.sendNotificationToUser(userId, {
      title: '⏰ Nhắc nhở lịch hẹn',
      message:
        reminderData.message || 'Lịch hẹn của bạn sắp bắt đầu trong 30 phút',
      type: 'APPOINTMENT_REMINDER',
      data: { appointmentId: reminderData.appointmentId },
      linkTo: reminderData.linkTo,
      icon: '⏰',
    }, false);

    // Emit notification:new via this gateway
    this.server.to(`user_${userId}`).emit('notification:new', {
      ...savedNotification.toObject(),
      timestamp: new Date(),
    });

    this.logger.log(`Sent reminder to user ${userId}`);
  }   data: { appointmentId: reminderData.appointmentId },
      linkTo: reminderData.linkTo,
      icon: '⏰',
    });

    this.logger.log(`Sent reminder to user ${userId}`);
  }

  /**
   * Check if user is online
   */
  isUserOnline(userId: string): boolean {
    return this.connectedUsers.has(userId);
  }
}
