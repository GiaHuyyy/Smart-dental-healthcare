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
import { MessageDocument } from './schemas/message.schema';

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

  @SubscribeMessage('createConversation')
  async handleCreateConversation(
    @MessageBody() data: { patientId: string; doctorId: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    try {
      const { patientId, doctorId } = data;
      this.logger.log(
        `Yêu cầu tạo cuộc hội thoại từ patient ${patientId} cho doctor ${doctorId}`,
      );

      const conversation = await this.realtimeChatService.createConversation({
        patientId: new Types.ObjectId(patientId),
        doctorId: new Types.ObjectId(doctorId),
      });

      // Populate thông tin chi tiết để gửi về cho các client
      const fullConversation =
        await this.realtimeChatService.getConversationById(
          conversation._id as Types.ObjectId,
        );

      // Chuẩn bị payload cho patient (người tạo) và doctor
      const patientPayload = this.transformConversationForUser(
        fullConversation,
        'patient',
      );
      const doctorPayload = this.transformConversationForUser(
        fullConversation,
        'doctor',
      );

      // Gửi sự kiện 'conversationCreated' đến cả hai người
      this.server
        .to(`user_${patientId}`)
        .emit('conversationCreated', patientPayload);
      this.server
        .to(`user_${doctorId}`)
        .emit('conversationCreated', doctorPayload);
      this.logger.log(
        `Đã gửi 'conversationCreated' tới user ${patientId} và ${doctorId}`,
      );
      console.log('patientPayload:', patientPayload);
      console.log('doctorPayload:', doctorPayload);

      // ✅ SỬA LẠI ĐÂY: Trả về patientPayload (đã có đủ thông tin) cho client đã gọi
      return { success: true, conversation: patientPayload };
    } catch (error) {
      this.logger.error('Lỗi trong handleCreateConversation:', error);
      return { success: false, error: error.message };
    }
  }

  // Bạn cũng cần một hàm helper để transform dữ liệu, hãy thêm nó vào trong gateway
  private transformConversationForUser(conv: any, role: 'patient' | 'doctor') {
    console.log('Transforming conversation for role:', role, conv);
    const convId = conv._id.toString();
    if (role === 'doctor') {
      return {
        id: convId,
        patientId: conv.patientId?._id.toString(),
        patientName: conv.patientId?.fullName || 'Bệnh nhân',
        patientEmail: conv.patientId?.email,
        patientAvatar: conv.patientId?.avatarUrl,
        lastMessage: conv.lastMessage?.content || 'Cuộc hội thoại mới',
        timestamp: conv.lastMessageAt || conv.updatedAt,
        unread: conv.unreadDoctorCount > 0,
        unreadCount: conv.unreadDoctorCount,
        databaseId: convId,
      };
    } else {
      // patient
      return {
        id: convId,
        doctorId: conv.doctorId?._id.toString(),
        doctorName: conv.doctorId?.fullName || 'Bác sĩ',
        doctorAvatar: conv.doctorId?.avatarUrl,
        specialty: conv.doctorId?.specialty || 'Nha khoa tổng quát',
        lastMessage: conv.lastMessage?.content || 'Cuộc hội thoại mới',
        timestamp: conv.lastMessageAt || conv.updatedAt,
        unread: conv.unreadPatientCount > 0,
        unreadCount: conv.unreadPatientCount,
        databaseId: convId,
      };
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

  // File: src/realtime-chat/realtime-chat.gateway.ts

  @SubscribeMessage('sendMessage')
  async handleSendMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: SendMessageDto,
  ) {
    try {
      const userId = client.userId;
      const userRole = client.userRole;

      if (!userId || !userRole) {
        client.emit('messageError', { error: 'Không thể xác thực người gửi.' });
        return;
      }

      const processedDto: SendMessageDto = {
        ...data,
        conversationId: new Types.ObjectId(data.conversationId),
      };

      // 1. Lưu tin nhắn vào database
      const message = await this.realtimeChatService.sendMessage(
        new Types.ObjectId(userId),
        userRole,
        processedDto, // Dùng DTO mới đã chuẩn hóa
      );
      this.logger.log(`Tin nhắn đã được lưu: ${message._id}`);

      // 2. Lấy thông tin đầy đủ của cuộc trò chuyện để biết ai là người nhận
      const conversation = await this.realtimeChatService.getConversationById(
        new Types.ObjectId(data.conversationId),
      );
      if (!conversation) {
        this.logger.error(
          `Không tìm thấy conversation với ID: ${data.conversationId}`,
        );
        return;
      }

      // 3. Gửi sự kiện 'newMessage' tới CẢ HAI người tham gia
      const patientRoom = `user_${conversation.patientId._id.toString()}`;
      const doctorRoom = `user_${conversation.doctorId._id.toString()}`;

      const payload = {
        message, // Tin nhắn đã được populate đầy đủ thông tin senderId từ service
        conversationId: data.conversationId.toString(),
      };

      this.server.to(patientRoom).to(doctorRoom).emit('newMessage', payload);
      this.logger.log(
        `Đã gửi sự kiện 'newMessage' tới phòng: ${patientRoom} và ${doctorRoom}`,
      );

      // 4. (Giữ nguyên) Cập nhật trạng thái cuộc hội thoại (tin nhắn cuối, unread count) cho cả hai
      this.server
        .to(patientRoom)
        .to(doctorRoom)
        .emit('conversationUpdated', conversation);
      this.logger.log(
        `Đã gửi sự kiện 'conversationUpdated' tới cả hai người dùng.`,
      );
    } catch (error) {
      this.logger.error('Lỗi trong sendMessage:', error);
      client.emit('messageError', { error: error.message });
    }
  }

  async broadcastNewMessage(
    conversationId: Types.ObjectId,
    message: MessageDocument,
  ) {
    try {
      this.logger.log(
        `📢 [broadcastNewMessage] Starting broadcast for message ${message._id}, type: ${message.messageType}`,
      );

      const conversation =
        await this.realtimeChatService.getConversationById(conversationId);
      if (!conversation) {
        this.logger.warn(
          `📢 [broadcastNewMessage] Conversation ${conversationId} not found`,
        );
        return;
      }

      const patientRoom = `user_${conversation.patientId._id.toString()}`;
      const doctorRoom = `user_${conversation.doctorId._id.toString()}`;

      const payload = {
        message,
        conversationId: conversationId.toString(),
      };

      this.logger.log(
        `📢 [broadcastNewMessage] Emitting to rooms: ${patientRoom}, ${doctorRoom}`,
      );

      this.server.to(patientRoom).to(doctorRoom).emit('newMessage', payload);

      // Cập nhật sidebar cho cả hai
      const patientPayload = this.transformConversationForUser(
        conversation,
        'patient',
      );
      const doctorPayload = this.transformConversationForUser(
        conversation,
        'doctor',
      );
      this.server.to(patientRoom).emit('conversationUpdated', patientPayload);
      this.server.to(doctorRoom).emit('conversationUpdated', doctorPayload);

      this.logger.log(
        `✅ [broadcastNewMessage] Successfully broadcasted message ${message._id} (${message.messageType}) to rooms: ${patientRoom}, ${doctorRoom}`,
      );
    } catch (error) {
      this.logger.error(
        `❌ [broadcastNewMessage] Failed to broadcast: ${error}`,
      );
    }
  }

  /**
   * Broadcast call message update to both patient and doctor
   * Called when a call ends to update the call status in real-time
   */
  async broadcastCallMessageUpdate(
    conversationId: Types.ObjectId,
    message: MessageDocument,
  ) {
    try {
      this.logger.log(
        `📞 [broadcastCallMessageUpdate] Starting for message ${message._id}, status: ${message.callData?.callStatus}`,
      );

      const conversation =
        await this.realtimeChatService.getConversationById(conversationId);
      if (!conversation) {
        this.logger.warn(
          `📞 [broadcastCallMessageUpdate] Conversation ${conversationId} not found`,
        );
        return;
      }

      const patientRoom = `user_${conversation.patientId._id.toString()}`;
      const doctorRoom = `user_${conversation.doctorId._id.toString()}`;

      const payload = {
        message,
        conversationId: conversationId.toString(),
      };

      this.logger.log(
        `📞 [broadcastCallMessageUpdate] Emitting to rooms: ${patientRoom}, ${doctorRoom}`,
      );

      // Emit call message update event
      this.server
        .to(patientRoom)
        .to(doctorRoom)
        .emit('callMessageUpdated', payload);

      this.logger.log(
        `✅ [broadcastCallMessageUpdate] Successfully broadcasted message ${message._id} to rooms: ${patientRoom}, ${doctorRoom}`,
      );
    } catch (error) {
      this.logger.error(`❌ [broadcastCallMessageUpdate] Failed: ${error}`);
    }
  }

  @SubscribeMessage('markConversationAsRead')
  async handleMarkAsRead(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    try {
      const userId = client.userId;
      const userRole = client.userRole;

      if (!userId || !userRole) {
        this.logger.warn('markConversationAsRead: User not authenticated');
        return;
      }

      this.logger.log(
        `User ${userId} marking conversation ${data.conversationId} as read.`,
      );

      // Gọi service để cập nhật unreadCount trong DB
      const updatedConversation =
        await this.realtimeChatService.markConversationAsRead(
          new Types.ObjectId(data.conversationId),
          new Types.ObjectId(userId),
          userRole,
        );

      if (updatedConversation) {
        // Gửi sự kiện cập nhật lại cho cả 2 người trong cuộc trò chuyện
        // để đồng bộ trạng thái "đã đọc" trên mọi thiết bị
        const patientRoom = `user_${updatedConversation.patientId.toString()}`;
        const doctorRoom = `user_${updatedConversation.doctorId.toString()}`;

        const patientPayload = this.transformConversationForUser(
          updatedConversation,
          'patient',
        );
        const doctorPayload = this.transformConversationForUser(
          updatedConversation,
          'doctor',
        );

        this.server.to(patientRoom).emit('conversationUpdated', patientPayload);
        this.server.to(doctorRoom).emit('conversationUpdated', doctorPayload);

        this.logger.log(
          `Sent 'conversationUpdated' after marking as read to rooms: ${patientRoom}, ${doctorRoom}`,
        );
      }
    } catch (error) {
      this.logger.error('Error in handleMarkAsRead:', error);
    }
  }

  @SubscribeMessage('loadConversations')
  async handleLoadConversations(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { userId: string; userRole: 'patient' | 'doctor' },
  ) {
    try {
      const userId = data.userId || client.userId;
      const userRole = data.userRole || client.userRole;

      if (!userId || !userRole) {
        this.logger.error('Missing userId or userRole in loadConversations');
        return;
      }

      this.logger.log(`Loading conversations for ${userRole} ${userId}`);

      const conversations = await this.realtimeChatService.getUserConversations(
        new Types.ObjectId(userId),
        userRole,
      );

      this.logger.log(
        `Found ${conversations.length} conversations for user ${userId}`,
      );

      // Transform conversations for frontend based on user role
      const transformedConversations = conversations.map((conv) => {
        const convId = (conv._id as any)?.toString() || conv._id;

        if (userRole === 'doctor') {
          // Format for doctor (showing patient info)
          return {
            _id: convId,
            id: convId,
            patientId: conv.patientId
              ? (conv.patientId as any)._id?.toString() || conv.patientId
              : '',
            patientName: conv.patientId
              ? (conv.patientId as any).fullName ||
                `${(conv.patientId as any).firstName || ''} ${(conv.patientId as any).lastName || ''}`.trim() ||
                'Bệnh nhân'
              : 'Bệnh nhân',
            patientEmail: conv.patientId
              ? (conv.patientId as any).email || ''
              : '',
            patientAvatar: conv.patientId
              ? (conv.patientId as any).avatarUrl || ''
              : '',
            lastMessage: conv.lastMessage
              ? (() => {
                  switch ((conv.lastMessage as any).messageType) {
                    case 'text':
                      return (conv.lastMessage as any).content || '';
                    case 'image':
                      return 'Đã gửi một ảnh';
                    case 'video':
                      return 'Đã gửi một video';
                    case 'file':
                      return 'Đã gửi một tệp';
                    default:
                      return 'Đã gửi một tệp';
                  }
                })()
              : 'Cuộc hội thoại mới',
            timestamp:
              conv.lastMessageAt ||
              (conv as any).updatedAt ||
              (conv as any).createdAt ||
              new Date(),
            unread: conv.unreadDoctorCount > 0,
            unreadCount: conv.unreadDoctorCount || 0,
            databaseId: convId,
          };
        } else {
          // Format for patient (showing doctor info)
          return {
            _id: convId,
            id: convId,
            doctorId: conv.doctorId
              ? (conv.doctorId as any)._id?.toString() || conv.doctorId
              : '',
            doctorName: conv.doctorId
              ? (conv.doctorId as any).fullName ||
                `${(conv.doctorId as any).firstName || ''} ${(conv.doctorId as any).lastName || ''}`.trim() ||
                'Bác sĩ'
              : 'Bác sĩ',
            doctorAvatar: conv.doctorId
              ? (conv.doctorId as any).avatarUrl || ''
              : '',
            doctorSpecialty: conv.doctorId
              ? (conv.doctorId as any).specialty || 'Nha khoa tổng quát'
              : 'Nha khoa tổng quát',
            specialty: conv.doctorId
              ? (conv.doctorId as any).specialty || 'Nha khoa tổng quát'
              : 'Nha khoa tổng quát',
            lastMessage: conv.lastMessage
              ? (() => {
                  switch ((conv.lastMessage as any).messageType) {
                    case 'text':
                      return (conv.lastMessage as any).content || '';
                    case 'image':
                      return 'Đã gửi một ảnh';
                    case 'video':
                      return 'Đã gửi một video';
                    case 'file':
                      return 'Đã gửi một file';
                    default:
                      return 'Đã gửi một tệp';
                  }
                })()
              : 'Cuộc hội thoại mới',
            timestamp:
              conv.lastMessageAt ||
              (conv as any).updatedAt ||
              (conv as any).createdAt ||
              new Date(),
            unread: conv.unreadPatientCount > 0,
            unreadCount: conv.unreadPatientCount || 0,
            databaseId: convId,
          };
        }
      });

      // Emit conversations back to client
      client.emit('conversationsLoaded', {
        conversations: transformedConversations,
      });

      this.logger.log(
        `✅ Successfully emitted ${transformedConversations.length} conversations to client ${client.id}`,
      );
    } catch (error) {
      this.logger.error('Error in loadConversations:', error);
      client.emit('conversationsError', { error: error.message });
    }
  }

  @SubscribeMessage('loadMessages')
  async handleLoadMessages(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody()
    data: {
      conversationId: string;
      userId: string;
      userRole: 'patient' | 'doctor';
      limit?: number;
    },
  ) {
    try {
      const { conversationId, userId, userRole, limit = 100 } = data;

      if (!userId || !userRole) {
        this.logger.error('Missing userId or userRole in loadMessages');
        return;
      }

      this.logger.log(`Loading messages for conversation ${conversationId}`);

      const messages = await this.realtimeChatService.getConversationMessages(
        new Types.ObjectId(conversationId),
        new Types.ObjectId(userId),
        userRole,
        1,
        limit || 50,
      );

      this.logger.log(
        `Found ${messages.length} messages for conversation ${conversationId}`,
      );

      // Emit messages back to client
      client.emit('messagesLoaded', {
        conversationId,
        messages,
      });

      this.logger.log(`Emitted ${messages.length} messages to client`);
    } catch (error) {
      this.logger.error('Error in loadMessages:', error);
      client.emit('messagesError', { error: error.message });
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
