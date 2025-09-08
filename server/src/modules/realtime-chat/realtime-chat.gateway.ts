import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { Types } from 'mongoose';
import { RealtimeChatService } from './realtime-chat.service';
import { SendMessageDto } from './dto/send-message.dto';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userRole?: 'patient' | 'doctor';
}

@WebSocketGateway({
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  namespace: '/chat',
})
export class RealtimeChatGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(RealtimeChatGateway.name);
  private connectedUsers: Map<string, string> = new Map(); // userId -> socketId

  constructor(private readonly realtimeChatService: RealtimeChatService) {}

  async handleConnection(client: AuthenticatedSocket) {
    try {
      // Extract user info from token (simplified - you should implement proper JWT validation)
      const token = client.handshake.auth.token;
      if (!token) {
        client.disconnect();
        return;
      }

      // TODO: Validate JWT token and extract user info
      // For now, assuming user info is passed in handshake
      const userId = client.handshake.auth.userId;
      const userRole = client.handshake.auth.userRole;

      if (!userId || !userRole) {
        client.disconnect();
        return;
      }

      client.userId = userId;
      client.userRole = userRole as 'patient' | 'doctor';

      // Store connection
      this.connectedUsers.set(userId, client.id);

      // Join user to their personal room
      client.join(`user_${userId}`);

      // Join user to their conversations
      const conversations = await this.realtimeChatService.getUserConversations(
        new Types.ObjectId(userId),
        userRole as 'patient' | 'doctor',
      );

      conversations.forEach((conversation) => {
        client.join(`conversation_${conversation._id}`);
      });

      this.logger.log(
        `User ${userId} (${userRole}) connected with socket ${client.id}`,
      );

      // Emit online status to relevant users
      client.broadcast.emit('userOnline', { userId, userRole });
    } catch (error) {
      this.logger.error('Error in handleConnection:', error);
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    const userId = client.userId;
    if (userId) {
      this.connectedUsers.delete(userId);

      // Emit offline status
      client.broadcast.emit('userOffline', { userId });

      this.logger.log(`User ${userId} disconnected`);
    }
  }

  @SubscribeMessage('joinConversation')
  async handleJoinConversation(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    try {
      const { conversationId } = data;
      const userId = client.userId;
      const userRole = client.userRole;

      if (!userId || !userRole) {
        return;
      }

      // Verify user is participant in conversation
      const conversation = await this.realtimeChatService.getConversationById(
        new Types.ObjectId(conversationId),
      );

      const isParticipant =
        (userRole === 'patient' &&
          conversation.patientId._id.toString() === userId) ||
        (userRole === 'doctor' &&
          conversation.doctorId._id.toString() === userId);

      if (isParticipant) {
        client.join(`conversation_${conversationId}`);
        this.logger.log(`User ${userId} joined conversation ${conversationId}`);
      }
    } catch (error) {
      this.logger.error('Error in joinConversation:', error);
    }
  }

  @SubscribeMessage('leaveConversation')
  handleLeaveConversation(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    const { conversationId } = data;
    client.leave(`conversation_${conversationId}`);
    this.logger.log(
      `User ${client.userId} left conversation ${conversationId}`,
    );
  }

  @SubscribeMessage('sendMessage')
  async handleSendMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: SendMessageDto,
  ) {
    try {
      const userId = client.userId;
      const userRole = client.userRole;

      if (!userId || !userRole) {
        return;
      }

      // Send message through service
      const message = await this.realtimeChatService.sendMessage(
        new Types.ObjectId(userId),
        userRole,
        data,
      );

      // Emit message to conversation participants
      this.server.to(`conversation_${data.conversationId}`).emit('newMessage', {
        message,
        conversationId: data.conversationId,
      });

      // Update conversation for both participants
      const conversation = await this.realtimeChatService.getConversationById(
        data.conversationId,
      );

      this.server
        .to(`user_${conversation.patientId._id}`)
        .to(`user_${conversation.doctorId._id}`)
        .emit('conversationUpdated', conversation);
    } catch (error) {
      this.logger.error('Error in sendMessage:', error);
      client.emit('messageError', { error: error.message });
    }
  }

  @SubscribeMessage('markMessageRead')
  async handleMarkMessageRead(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string; messageId: string },
  ) {
    try {
      const userId = client.userId;
      const userRole = client.userRole;

      if (!userId || !userRole) {
        return;
      }

      await this.realtimeChatService.markMessageAsRead(
        new Types.ObjectId(data.conversationId),
        new Types.ObjectId(data.messageId),
        new Types.ObjectId(userId),
        userRole,
      );

      // Notify other participant that message was read
      this.server
        .to(`conversation_${data.conversationId}`)
        .emit('messageRead', {
          conversationId: data.conversationId,
          messageId: data.messageId,
          readBy: userId,
        });
    } catch (error) {
      this.logger.error('Error in markMessageRead:', error);
    }
  }

  @SubscribeMessage('typing')
  async handleTyping(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string; isTyping: boolean },
  ) {
    try {
      const userId = client.userId;
      const userRole = client.userRole;

      if (!userId || !userRole) {
        return;
      }

      await this.realtimeChatService.updateTypingStatus(
        new Types.ObjectId(data.conversationId),
        new Types.ObjectId(userId),
        userRole,
        data.isTyping,
      );

      // Emit typing status to conversation participants (except sender)
      client.broadcast
        .to(`conversation_${data.conversationId}`)
        .emit('userTyping', {
          conversationId: data.conversationId,
          userId,
          userRole,
          isTyping: data.isTyping,
        });
    } catch (error) {
      this.logger.error('Error in typing:', error);
    }
  }

  // Method to get online users for a specific conversation
  getOnlineUsersForConversation(conversationId: string): string[] {
    const room = this.server.sockets.adapter.rooms.get(
      `conversation_${conversationId}`,
    );
    return room ? Array.from(room) : [];
  }

  // Method to check if user is online
  isUserOnline(userId: string): boolean {
    return this.connectedUsers.has(userId);
  }
}
