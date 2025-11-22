import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Notification } from './schemas/notification.schemas'; // Fixed: using .schemas (plural) - the active file

// Use ConfigService to read FRONTEND_URL fallback consistently
const _config = new ConfigService();
const frontendUrl =
  _config.get<string>('CLIENT_URL') || 'http://localhost:3000';

@WebSocketGateway({
  cors: {
    origin: [frontendUrl, process.env.MOBILE_URL || 'http://localhost:8082'],
    credentials: true,
  },
  namespace: '/appointments', // Changed from /notifications to reuse client's socket connection
})
export class NotificationGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationGateway.name);
  private connectedUsers = new Map<string, string>(); // userId -> socketId

  constructor(
    @InjectModel(Notification.name)
    private notificationModel: Model<Notification>,
  ) {}

  handleConnection(client: Socket) {
    const userId = client.handshake.auth?.userId;

    if (userId) {
      this.connectedUsers.set(userId, client.id);
      client.join(`user_${userId}`);
      this.logger.log(
        `User ${userId} connected to notifications (socket: ${client.id})`,
      );
    } else {
      this.logger.warn(`Client ${client.id} connected without userId`);
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.handshake.auth?.userId;

    if (userId) {
      this.connectedUsers.delete(userId);
      this.logger.log(`User ${userId} disconnected from notifications`);
    }
  }

  /**
   * Send notification to specific user
   * @param emitSocket - If false, only save to DB without emitting socket event
   */
  async sendNotificationToUser(
    userId: string,
    notification: {
      title: string;
      message: string;
      type: string;
      data?: any;
      linkTo?: string;
      icon?: string;
    },
    emitSocket: boolean = true,
  ) {
    try {
      this.logger.log('📨 sendNotificationToUser called');
      this.logger.log('User ID:', userId);
      this.logger.log('Notification type:', notification.type);
      this.logger.log(
        'Full notification:',
        JSON.stringify(notification, null, 2),
      );

      // Save to database
      const savedNotification = await this.notificationModel.create({
        userId,
        ...notification,
        isRead: false,
      });

      this.logger.log('✅ Notification saved to DB:', savedNotification._id);

      // Emit to user's room only if emitSocket is true
      if (emitSocket) {
        this.server.to(`user_${userId}`).emit('notification:new', {
          ...savedNotification.toObject(),
          timestamp: new Date(),
        });
        this.logger.log('✅ Socket event emitted to user room');
      }

      this.logger.log(
        `Sent notification to user ${userId}: ${notification.type}`,
      );

      return savedNotification;
    } catch (error) {
      this.logger.error(`Failed to send notification to user ${userId}:`);
      this.logger.error('Error details:', error);
      this.logger.error(
        'Notification that failed:',
        JSON.stringify(notification, null, 2),
      );
      throw error;
    }
  }

  /**
   * Send notification to multiple users
   */
  async sendNotificationToUsers(
    userIds: string[],
    notification: {
      title: string;
      message: string;
      type: string;
      data?: any;
      linkTo?: string;
      icon?: string;
    },
  ) {
    try {
      const promises = userIds.map((userId) =>
        this.sendNotificationToUser(userId, notification),
      );
      await Promise.all(promises);

      this.logger.log(
        `Sent notification to ${userIds.length} users: ${notification.type}`,
      );
    } catch (error) {
      this.logger.error('Failed to send notifications to users:', error);
      throw error;
    }
  }

  /**
   * Notify user that notification was read
   */
  notifyNotificationRead(userId: string, notificationId: string) {
    this.server.to(`user_${userId}`).emit('notification:read', {
      notificationId,
      timestamp: new Date(),
    });
  }

  /**
   * Notify user that all notifications were read
   */
  notifyAllNotificationsRead(userId: string) {
    this.server.to(`user_${userId}`).emit('notification:allRead', {
      timestamp: new Date(),
    });
  }

  /**
   * Check if user is online
   */
  isUserOnline(userId: string): boolean {
    return this.connectedUsers.has(userId);
  }

  /**
   * Get unread count for user
   */
  async getUnreadCount(userId: string): Promise<number> {
    return this.notificationModel.countDocuments({
      userId,
      isRead: false,
    });
  }

  /**
   * Notify patient about new follow-up suggestion
   */
  async notifyFollowUpSuggestion(patientId: string, suggestion: any) {
    this.logger.log('🔔 notifyFollowUpSuggestion called');
    this.logger.log('Patient ID:', patientId);
    this.logger.log('Suggestion:', JSON.stringify(suggestion, null, 2));

    const doctorName =
      typeof suggestion.doctorId === 'object'
        ? suggestion.doctorId.fullName
        : '';

    this.logger.log('Doctor name:', doctorName);

    const notificationData = {
      title: '🔔 Đề xuất tái khám',
      message: doctorName
        ? `Bác sĩ ${doctorName} đã đề xuất lịch tái khám cho bạn với ưu đãi giảm giá 5%`
        : 'Bác sĩ đã đề xuất lịch tái khám cho bạn với ưu đãi giảm giá 5%',
      type: 'FOLLOW_UP_SUGGESTION',
      data: {
        appointmentId: suggestion._id,
      },
      linkTo: '/patient/appointments?tab=follow-ups',
      icon: '🔔',
    };

    this.logger.log(
      'Notification data:',
      JSON.stringify(notificationData, null, 2),
    );

    try {
      // Save to DB without socket emit (we'll emit manually below)
      const savedNotification = await this.sendNotificationToUser(
        patientId,
        notificationData,
        false, // ✅ Don't emit from sendNotificationToUser
      );

      // Emit notification:new manually (like AppointmentNotificationGateway does)
      this.server.to(`user_${patientId}`).emit('notification:new', {
        ...savedNotification.toObject(),
        timestamp: new Date(),
      });

      this.logger.log('✅ Notification sent successfully');
      this.logger.log('✅ Socket event emitted to user room');
    } catch (error) {
      this.logger.error('❌ Failed to send notification:', error);
      throw error;
    }
  }

  /**
   * Notify doctor that patient rejected follow-up suggestion
   */
  async notifyFollowUpRejected(doctorId: string, suggestion: any) {
    this.logger.log('🔔 notifyFollowUpRejected called');
    this.logger.log('Doctor ID:', doctorId);
    this.logger.log('Suggestion patientId type:', typeof suggestion.patientId);
    this.logger.log('Suggestion patientId value:', suggestion.patientId);

    const patientName =
      typeof suggestion.patientId === 'object' && suggestion.patientId?.fullName
        ? suggestion.patientId.fullName
        : '';

    this.logger.log('Patient name extracted:', patientName);

    const notificationData = {
      title: 'Đề xuất tái khám bị từ chối',
      message: patientName
        ? `Bệnh nhân ${patientName} đã từ chối đề xuất tái khám của bạn`
        : 'Bệnh nhân đã từ chối đề xuất tái khám của bạn',
      type: 'FOLLOW_UP_REJECTED',
      data: {
        suggestionId: suggestion._id,
        patientId: suggestion.patientId,
      },
      linkTo: '/doctor/follow-ups',
      icon: '❌',
    };

    this.logger.log(
      'Notification data:',
      JSON.stringify(notificationData, null, 2),
    );

    try {
      // Save to DB without socket emit (we'll emit manually below)
      const savedNotification = await this.sendNotificationToUser(
        doctorId,
        notificationData,
        false, // ✅ Don't emit from sendNotificationToUser
      );

      // Emit notification:new manually (like AppointmentNotificationGateway does)
      this.server.to(`user_${doctorId}`).emit('notification:new', {
        ...savedNotification.toObject(),
        timestamp: new Date(),
      });

      this.logger.log('✅ Notification sent successfully');
      this.logger.log('✅ Socket event emitted to user room');
    } catch (error) {
      this.logger.error('❌ Failed to send notification:', error);
      throw error;
    }
  }
}
