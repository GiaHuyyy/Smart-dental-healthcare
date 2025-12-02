import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { RealtimeChatService } from '../realtime-chat/realtime-chat.service';
import { RealtimeChatGateway } from '../realtime-chat/realtime-chat.gateway';

// Interfaces
interface ConnectedUser {
  socketId: string;
  odataId: string;
  userName: string;
  userRole: 'doctor' | 'patient';
}

interface ActiveCall {
  callId: string;
  callerId: string;
  receiverId: string;
  callerName: string;
  receiverName: string;
  isVideoCall: boolean;
  startedAt: Date;
  answeredAt?: Date;
  messageId?: string;
}

@WebSocketGateway({
  cors: {
    origin: [
      process.env.CLIENT_URL || 'http://localhost:3000',
      'http://localhost:3000',
      'http://localhost:8082',
    ],
    methods: ['GET', 'POST'],
    credentials: true,
  },
  namespace: '/webrtc',
})
export class WebRTCGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private logger = new Logger('WebRTCGateway');
  private connectedUsers = new Map<string, ConnectedUser>();
  private activeCalls = new Map<string, ActiveCall>();

  constructor(
    private readonly realtimeChatService: RealtimeChatService,
    private readonly realtimeChatGateway: RealtimeChatGateway,
  ) {}

  // ==================== CONNECTION HANDLERS ====================

  handleConnection(client: Socket) {
    this.logger.log(`🔌 Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`🔌 Client disconnected: ${client.id}`);

    // Find and remove user
    for (const [odataId, user] of this.connectedUsers.entries()) {
      if (user.socketId === client.id) {
        this.connectedUsers.delete(odataId);
        this.logger.log(`👤 User ${odataId} removed from WebRTC`);

        // End any active calls for this user
        void this.handleUserDisconnectFromCall(odataId);
        break;
      }
    }
  }

  // ==================== SOCKET EVENTS ====================

  /**
   * User joins WebRTC - registers for calls
   */
  @SubscribeMessage('join')
  handleJoin(
    @MessageBody()
    data: { odataId: string; userName: string; userRole: 'doctor' | 'patient' },
    @ConnectedSocket() client: Socket,
  ) {
    this.logger.log(`👤 User joining: ${data.userName} (${data.odataId})`);

    this.connectedUsers.set(data.odataId, {
      socketId: client.id,
      odataId: data.odataId,
      userName: data.userName,
      userRole: data.userRole,
    });

    client.emit('joined', { success: true });
    this.logger.log(
      `✅ User ${data.userName} joined WebRTC. Total users: ${this.connectedUsers.size}`,
    );
  }

  /**
   * Check if a user is online
   */
  @SubscribeMessage('check-online')
  handleCheckOnline(
    @MessageBody() data: { odataId: string },
    @ConnectedSocket() client: Socket,
  ) {
    this.logger.log(`🔍 Check online request for: ${data.odataId}`);
    this.logger.log(
      `📋 Connected users: ${Array.from(this.connectedUsers.keys()).join(', ')}`,
    );
    const isOnline = this.connectedUsers.has(data.odataId);
    this.logger.log(
      `📤 Sending online-status: ${data.odataId} is ${isOnline ? 'ONLINE' : 'OFFLINE'}`,
    );
    client.emit('online-status', { odataId: data.odataId, isOnline });
  }

  /**
   * Initiate a call to another user
   */
  @SubscribeMessage('call-user')
  async handleCallUser(
    @MessageBody()
    data: {
      callId: string;
      callerId: string;
      callerName: string;
      callerAvatar?: string;
      receiverId: string;
      receiverName: string;
      isVideoCall: boolean;
      signalData: any;
    },
    @ConnectedSocket() client: Socket,
  ) {
    this.logger.log(
      `📞 Call from ${data.callerName} to ${data.receiverName} (${data.isVideoCall ? 'video' : 'audio'})`,
    );

    // Check if receiver is online
    const receiver = this.connectedUsers.get(data.receiverId);
    if (!receiver) {
      this.logger.warn(`❌ Receiver ${data.receiverId} is not online`);
      client.emit('call-failed', { reason: 'Người nhận không online' });
      return;
    }

    // Check if either party is already in a call
    const existingCall =
      this.findActiveCallForUser(data.callerId) ||
      this.findActiveCallForUser(data.receiverId);
    if (existingCall) {
      this.logger.warn(`❌ One of the users is already in a call`);
      client.emit('call-failed', {
        reason: 'Một trong hai bên đang trong cuộc gọi khác',
      });
      return;
    }

    // Use callId from client
    const callId = data.callId;

    // Create call message in chat history
    let messageId: string | undefined;
    try {
      const caller = this.connectedUsers.get(data.callerId);
      const callMessage = await this.realtimeChatService.createCallMessage(
        data.callerId,
        data.receiverId,
        caller?.userRole || 'patient',
        {
          callType: data.isVideoCall ? 'video' : 'audio',
          callStatus: 'missed', // Default to missed, will update when answered
          callDuration: 0,
          startedAt: new Date(),
        },
      );
      messageId = (callMessage as any)?._id?.toString();
    } catch (error) {
      this.logger.error('Failed to create call message:', error);
    }

    // Store active call
    const activeCall: ActiveCall = {
      callId,
      callerId: data.callerId,
      receiverId: data.receiverId,
      callerName: data.callerName,
      receiverName: data.receiverName,
      isVideoCall: data.isVideoCall,
      startedAt: new Date(),
      messageId,
    };
    this.activeCalls.set(callId, activeCall);

    // Send incoming call to receiver
    this.server.to(receiver.socketId).emit('incoming-call', {
      callId,
      callerId: data.callerId,
      callerName: data.callerName,
      callerAvatar: data.callerAvatar,
      isVideoCall: data.isVideoCall,
      signalData: data.signalData,
    });

    // Confirm call initiated to caller
    client.emit('call-initiated', { callId, messageId });
    this.logger.log(`✅ Call ${callId} initiated`);
  }

  /**
   * Answer an incoming call
   */
  @SubscribeMessage('answer-call')
  async handleAnswerCall(
    @MessageBody()
    data: {
      callId: string;
      signalData: any;
    },
    @ConnectedSocket() client: Socket,
  ) {
    this.logger.log(`✅ Call ${data.callId} being answered`);

    const call = this.activeCalls.get(data.callId);
    if (!call) {
      this.logger.warn(`❌ Call ${data.callId} not found`);
      client.emit('call-error', { reason: 'Cuộc gọi không tồn tại' });
      return;
    }

    // Update call status
    call.answeredAt = new Date();

    // Update call message status to answered
    if (call.messageId) {
      try {
        await this.realtimeChatService.updateCallStatus(
          call.messageId,
          'answered',
          0,
        );
      } catch (error) {
        this.logger.error('Failed to update call status:', error);
      }
    }

    // Send answer signal to caller
    const caller = this.connectedUsers.get(call.callerId);
    if (caller) {
      this.server.to(caller.socketId).emit('call-answered', {
        callId: data.callId,
        signalData: data.signalData,
      });
    }

    this.logger.log(`✅ Call ${data.callId} answered`);
  }

  /**
   * Reject an incoming call
   */
  @SubscribeMessage('reject-call')
  async handleRejectCall(
    @MessageBody() data: { callId: string; reason?: string },
    @ConnectedSocket() client: Socket,
  ) {
    this.logger.log(
      `❌ Call ${data.callId} rejected: ${data.reason || 'No reason'}`,
    );

    const call = this.activeCalls.get(data.callId);
    if (!call) return;

    // Update call message status to rejected and broadcast
    if (call.messageId) {
      try {
        const updatedMessage = await this.realtimeChatService.updateCallStatus(
          call.messageId,
          'rejected',
          0,
        );

        // Broadcast call message update to chat
        if (updatedMessage && updatedMessage.conversationId) {
          await this.realtimeChatGateway.broadcastCallMessageUpdate(
            updatedMessage.conversationId,
            updatedMessage,
          );
        }
      } catch (error) {
        this.logger.error('Failed to update call status:', error);
      }
    }

    // Notify caller
    const caller = this.connectedUsers.get(call.callerId);
    if (caller) {
      this.server.to(caller.socketId).emit('call-rejected', {
        callId: data.callId,
        reason: data.reason || 'Cuộc gọi bị từ chối',
      });
    }

    // Remove call
    this.activeCalls.delete(data.callId);
  }

  /**
   * End an active call
   */
  @SubscribeMessage('end-call')
  async handleEndCall(
    @MessageBody() data: { callId: string },
    @ConnectedSocket() client: Socket,
  ) {
    this.logger.log(`📞 Ending call ${data.callId}`);

    const call = this.activeCalls.get(data.callId);
    if (!call) return;

    // Calculate duration
    const duration = call.answeredAt
      ? Math.floor((Date.now() - call.answeredAt.getTime()) / 1000)
      : 0;

    // Update call message and broadcast to chat
    if (call.messageId) {
      try {
        const status = call.answeredAt ? 'completed' : 'missed';
        const updatedMessage = await this.realtimeChatService.updateCallStatus(
          call.messageId,
          status,
          duration,
        );

        // Broadcast call message update to chat so both parties see real-time update
        if (updatedMessage && updatedMessage.conversationId) {
          await this.realtimeChatGateway.broadcastCallMessageUpdate(
            updatedMessage.conversationId,
            updatedMessage,
          );
        }
      } catch (error) {
        this.logger.error('Failed to update call status:', error);
      }
    }

    // Notify both parties
    const caller = this.connectedUsers.get(call.callerId);
    const receiver = this.connectedUsers.get(call.receiverId);

    const endData = { callId: data.callId, duration };

    if (caller) {
      this.server.to(caller.socketId).emit('call-ended', endData);
    }
    if (receiver) {
      this.server.to(receiver.socketId).emit('call-ended', endData);
    }

    // Remove call
    this.activeCalls.delete(data.callId);
    this.logger.log(`✅ Call ${data.callId} ended. Duration: ${duration}s`);
  }

  /**
   * Send ICE candidate
   */
  @SubscribeMessage('ice-candidate')
  handleIceCandidate(
    @MessageBody() data: { callId: string; candidate: any; toUserId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const targetUser = this.connectedUsers.get(data.toUserId);
    if (targetUser) {
      this.server.to(targetUser.socketId).emit('ice-candidate', {
        callId: data.callId,
        candidate: data.candidate,
      });
    }
  }

  // ==================== HELPER METHODS ====================

  private findActiveCallForUser(odataId: string): ActiveCall | undefined {
    for (const call of this.activeCalls.values()) {
      if (call.callerId === odataId || call.receiverId === odataId) {
        return call;
      }
    }
    return undefined;
  }

  private async handleUserDisconnectFromCall(odataId: string) {
    const call = this.findActiveCallForUser(odataId);
    if (!call) return;

    // Calculate duration
    const duration = call.answeredAt
      ? Math.floor((Date.now() - call.answeredAt.getTime()) / 1000)
      : 0;

    // Update call message and broadcast to chat
    if (call.messageId) {
      try {
        const status = call.answeredAt ? 'completed' : 'missed';
        const updatedMessage = await this.realtimeChatService.updateCallStatus(
          call.messageId,
          status,
          duration,
        );

        // Broadcast call message update to chat
        if (updatedMessage && updatedMessage.conversationId) {
          await this.realtimeChatGateway.broadcastCallMessageUpdate(
            updatedMessage.conversationId,
            updatedMessage,
          );
        }
      } catch (error) {
        this.logger.error('Failed to update call status on disconnect:', error);
      }
    }

    // Notify the other party
    const otherUserId =
      call.callerId === odataId ? call.receiverId : call.callerId;
    const otherUser = this.connectedUsers.get(otherUserId);
    if (otherUser) {
      this.server.to(otherUser.socketId).emit('call-ended', {
        callId: call.callId,
        duration,
        reason: 'Người dùng đã ngắt kết nối',
      });
    }

    this.activeCalls.delete(call.callId);
  }
}
