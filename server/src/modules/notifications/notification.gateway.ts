import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Notification } from './schemas/notification.schema';

@WebSocketGateway({
  cors: {
    origin: [
      process.env.FRONTEND_URL || 'http://localhost:3000',
      process.env.MOBILE_URL || 'http://localhost:8082',
    ],
    credentials: true,
  },
  namespace: '/notifications',
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
      // Save to database
      const savedNotification = await this.notificationModel.create({
        userId,
        ...notification,
        isRead: false,
      });

      // Emit to user's room only if emitSocket is true
      if (emitSocket) {
        this.server.to(`user_${userId}`).emit('notification:new', {
          ...savedNotification.toObject(),
          timestamp: new Date(),
        });
      }

      this.logger.log(
        `Sent notification to user ${userId}: ${notification.type}`,
      );

      return savedNotification;
    } catch (error) {
      this.logger.error(
        `Failed to send notification to user ${userId}:`,
        error,
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
}
