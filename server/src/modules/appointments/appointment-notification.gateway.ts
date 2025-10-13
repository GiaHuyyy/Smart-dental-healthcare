import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

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
  notifyDoctorNewAppointment(doctorId: string, appointment: any) {
    this.server.to(`user_${doctorId}`).emit('appointment:new', {
      type: 'NEW_APPOINTMENT',
      appointment,
      message: 'Bạn có lịch hẹn mới',
      timestamp: new Date(),
    });
    this.logger.log(`Notified doctor ${doctorId} about new appointment`);
  }

  /**
   * Notify patient about appointment confirmation
   */
  notifyPatientAppointmentConfirmed(patientId: string, appointment: any) {
    this.server.to(`user_${patientId}`).emit('appointment:confirmed', {
      type: 'APPOINTMENT_CONFIRMED',
      appointment,
      message: 'Lịch hẹn của bạn đã được xác nhận',
      timestamp: new Date(),
    });
    this.logger.log(`Notified patient ${patientId} about confirmation`);
  }

  /**
   * Notify about appointment cancellation
   */
  notifyAppointmentCancelled(
    userId: string,
    appointment: any,
    cancelledBy: 'doctor' | 'patient',
  ) {
    const message =
      cancelledBy === 'doctor'
        ? 'Bác sĩ đã hủy lịch hẹn'
        : 'Bệnh nhân đã hủy lịch hẹn';

    this.server.to(`user_${userId}`).emit('appointment:cancelled', {
      type: 'APPOINTMENT_CANCELLED',
      appointment,
      cancelledBy,
      message,
      timestamp: new Date(),
    });
    this.logger.log(`Notified user ${userId} about cancellation`);
  }

  /**
   * Notify about appointment reschedule
   */
  notifyAppointmentRescheduled(userId: string, appointment: any) {
    this.server.to(`user_${userId}`).emit('appointment:rescheduled', {
      type: 'APPOINTMENT_RESCHEDULED',
      appointment,
      message: 'Lịch hẹn đã được dời sang thời gian khác',
      timestamp: new Date(),
    });
    this.logger.log(`Notified user ${userId} about reschedule`);
  }

  /**
   * Check if user is online
   */
  isUserOnline(userId: string): boolean {
    return this.connectedUsers.has(userId);
  }
}
