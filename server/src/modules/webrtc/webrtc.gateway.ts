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
import { Types } from 'mongoose';

interface CallOffer {
  callerId: string;
  callerName: string;
  callerRole: 'doctor' | 'patient';
  recipientId: string;
  callType: 'video' | 'audio';
  offer: RTCSessionDescriptionInit;
}

interface CallAnswer {
  callerId: string;
  recipientId: string;
  answer: RTCSessionDescriptionInit;
}

interface ICECandidate {
  callerId: string;
  recipientId: string;
  candidate: RTCIceCandidateInit;
}

interface CallRequest {
  callerId: string;
  callerName: string;
  callerRole: 'doctor' | 'patient';
  recipientId: string;
  callType: 'video' | 'audio';
}
// Deploy nhớ thay đổi origin cho đúng
@WebSocketGateway({
  cors: {
    origin: ['http://localhost:3000'],
    methods: ['GET', 'POST'],
    credentials: true,
  },
  namespace: '/webrtc',
})
export class WebRTCGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private logger: Logger = new Logger('WebRTCGateway');
  private connectedUsers = new Map<
    string,
    { socketId: string; userId: string; userRole: string; userName: string }
  >();
  private activeCalls = new Map<
    string,
    {
      messageId: string;
      callerId: string;
      receiverId: string;
      callType: 'audio' | 'video';
      startedAt: Date;
    }
  >();

  constructor(private readonly realtimeChatService: RealtimeChatService) {}

  handleConnection(client: Socket) {
    this.logger.log(`WebRTC Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`WebRTC Client disconnected: ${client.id}`);

    // Remove user from connected users
    for (const [userId, userInfo] of this.connectedUsers.entries()) {
      if (userInfo.socketId === client.id) {
        this.connectedUsers.delete(userId);
        this.logger.log(`User ${userId} removed from WebRTC connections`);
        break;
      }
    }
  }

  @SubscribeMessage('join-webrtc')
  handleJoinWebRTC(
    @MessageBody() data: { userId: string; userRole: string; userName: string },
    @ConnectedSocket() client: Socket,
  ) {
    this.logger.log(`User joined WebRTC: ${data.userId} (${data.userRole})`);

    this.connectedUsers.set(data.userId, {
      socketId: client.id,
      userId: data.userId,
      userRole: data.userRole,
      userName: data.userName,
    });

    client.emit('webrtc-joined', { success: true });
  }

@SubscribeMessage('call-user')
  async handleCallUser(
    @MessageBody()
    data: {
      callerId: string;
      receiverId: string;
      callerName: string;
      callerRole: string;
      isVideoCall: boolean;
      signal: any;
    },
    @ConnectedSocket() client: Socket,
  ) {
    this.logger.log(
      `Call initiated from ${data.callerId} to ${data.receiverId} (${data.isVideoCall ? 'video' : 'audio'})`,
    );

    // ---- THAY ĐỔI 1: Tạo key để kiểm tra và khóa ----
    // Dùng key này để đảm bảo chỉ có 1 cuộc gọi (theo 1 chiều) được thiết lập
    const callKey = `${data.callerId}-${data.receiverId}`;

    // Kiểm tra xem có cuộc gọi nào đang được thiết lập hoặc đang diễn ra không
    if (this.activeCalls.has(callKey)) {
      this.logger.warn(
        `Call from ${data.callerId} to ${data.receiverId} is already being processed. Ignoring duplicate request.`,
      );
      return; // Dừng ngay nếu đã có yêu cầu trước đó
    }

    // ---- THAY ĐỔI 2: "Khóa" ngay lập tức ----
    // Đặt một giá trị tạm thời vào map để chặn các yêu cầu tiếp theo
    // Giá trị này sẽ được cập nhật sau khi có messageId thật
    this.activeCalls.set(callKey, {
      messageId: 'pending-' + new Types.ObjectId().toString(), // ID tạm thời
      callerId: data.callerId,
      receiverId: data.receiverId,
      callType: data.isVideoCall ? 'video' : 'audio',
      startedAt: new Date(),
    });

    try {
      // Create call history message
      const callMessage = await this.realtimeChatService.createCallMessage(
        data.callerId,
        data.receiverId,
        data.callerRole as 'doctor' | 'patient',
        {
          callType: data.isVideoCall ? 'video' : 'audio',
          callStatus: 'missed', // Initial status, will be updated
          callDuration: 0,
          startedAt: new Date(),
        },
      );

      const realMessageId = (callMessage as any)._id.toString();

      // ---- THAY ĐỔI 3: Cập nhật messageId thật ----
      // Lấy lại mục đã khóa và cập nhật với messageId chính xác từ DB
      const activeCallData = this.activeCalls.get(callKey);
      if (activeCallData) {
        activeCallData.messageId = realMessageId;
        this.activeCalls.set(callKey, activeCallData);
      } else {
         // Trường hợp hiếm gặp: cuộc gọi đã bị hủy bởi một tiến trình khác
         this.logger.warn(`Active call data for ${callKey} disappeared unexpectedly.`);
         return;
      }

      const receiver = this.connectedUsers.get(data.receiverId);

      if (receiver) {
        // Send incoming call notification to receiver
        this.server.to(receiver.socketId).emit('incoming-call', {
          callerId: data.callerId,
          callerName: data.callerName,
          callerRole: data.callerRole,
          isVideoCall: data.isVideoCall,
          signal: data.signal,
          messageId: realMessageId, // Gửi đi messageId thật
        });

        // Confirm to caller that call was initiated
        client.emit('call-initiated', {
          receiverId: data.receiverId,
          messageId: realMessageId, // Gửi đi messageId thật
        });
      } else {
        // Receiver not online - update call status to missed
        await this.realtimeChatService.updateCallStatus(
          realMessageId,
          'missed',
          0,
        );
        // Dọn dẹp khóa vì cuộc gọi thất bại
        this.activeCalls.delete(callKey);

        client.emit('call-failed', {
          receiverId: data.receiverId,
          reason: 'User not online',
        });
      }
    } catch (error) {
      this.logger.error('Failed to create call message:', error);
      // Dọn dẹp khóa nếu có lỗi xảy ra
      this.activeCalls.delete(callKey);
      client.emit('call-failed', {
        receiverId: data.receiverId,
        reason: 'Internal error',
      });
    }
  }

  @SubscribeMessage('answer-call')
  async handleAnswerCall(
    @MessageBody()
    data: {
      callerId: string;
      receiverId: string;
      signal: any;
      messageId?: string;
    },
    @ConnectedSocket() client: Socket,
  ) {
    this.logger.log(
      `Call answered by ${data.receiverId} from ${data.callerId}`,
    );

    try {
      // Update call status to answered
      const callKey = `${data.callerId}-${data.receiverId}`;
      const activeCall = this.activeCalls.get(callKey);

      if (activeCall) {
        await this.realtimeChatService.updateCallStatus(
          activeCall.messageId,
          'answered',
          0,
        );
      }

      const caller = this.connectedUsers.get(data.callerId);

      if (caller) {
        // Send answer signal to caller
        this.server.to(caller.socketId).emit('call-accepted', {
          receiverId: data.receiverId,
          signal: data.signal,
        });
      }
    } catch (error) {
      this.logger.error('Failed to update call status to answered:', error);
    }
  }

  @SubscribeMessage('reject-call')
  async handleRejectCall(
    @MessageBody()
    data: { callerId: string; receiverId: string; messageId?: string },
    @ConnectedSocket() client: Socket,
  ) {
    this.logger.log(
      `Call rejected by ${data.receiverId} from ${data.callerId}`,
    );

    try {
      // Update call status to rejected
      const callKey = `${data.callerId}-${data.receiverId}`;
      const activeCall = this.activeCalls.get(callKey);

      if (activeCall) {
        await this.realtimeChatService.updateCallStatus(
          activeCall.messageId,
          'rejected',
          0,
        );
        this.activeCalls.delete(callKey);
      }

      const caller = this.connectedUsers.get(data.callerId);

      if (caller) {
        // Notify caller that call was rejected
        this.server.to(caller.socketId).emit('call-rejected', {
          receiverId: data.receiverId,
        });
      }
    } catch (error) {
      this.logger.error('Failed to update call status to rejected:', error);
    }
  }

  @SubscribeMessage('ice-candidate')
  handleIceCandidate(
    @MessageBody()
    data: {
      callerId: string;
      receiverId: string;
      candidate: RTCIceCandidateInit;
    },
    @ConnectedSocket() client: Socket,
  ) {
    this.logger.log(
      `ICE candidate exchange between ${data.callerId} and ${data.receiverId}`,
    );

    // Determine the recipient (the other party)
    const currentUserId = data.callerId;
    const otherUserId = data.receiverId;

    const recipient = this.connectedUsers.get(otherUserId);

    if (recipient) {
      this.server.to(recipient.socketId).emit('ice-candidate', {
        callerId: data.callerId,
        receiverId: data.receiverId,
        candidate: data.candidate,
      });
    }
  }

  @SubscribeMessage('end-call')
  async handleEndCall(
    @MessageBody()
    data: { callerId: string; receiverId: string; messageId?: string },
    @ConnectedSocket() client: Socket,
  ) {
    this.logger.log(
      `Call ended between ${data.callerId} and ${data.receiverId}`,
    );

    try {
      // Update call status to completed with duration
      const callKey = `${data.callerId}-${data.receiverId}`;
      const activeCall = this.activeCalls.get(callKey);

      if (activeCall) {
        const callDuration = Math.floor(
          (new Date().getTime() - activeCall.startedAt.getTime()) / 1000,
        );

        await this.realtimeChatService.updateCallStatus(
          activeCall.messageId,
          'completed',
          callDuration,
        );
        this.activeCalls.delete(callKey);
      }

      const caller = this.connectedUsers.get(data.callerId);
      const receiver = this.connectedUsers.get(data.receiverId);

      // Notify both parties that call ended
      if (caller && caller.socketId !== client.id) {
        this.server.to(caller.socketId).emit('call-ended', {
          otherUserId: data.receiverId,
        });
      }

      if (receiver && receiver.socketId !== client.id) {
        this.server.to(receiver.socketId).emit('call-ended', {
          otherUserId: data.callerId,
        });
      }
    } catch (error) {
      this.logger.error('Failed to update call status to completed:', error);
    }
  }

  @SubscribeMessage('call-request')
  handleCallRequest(
    @MessageBody() data: CallRequest,
    @ConnectedSocket() client: Socket,
  ) {
    this.logger.log(
      `Call request from ${data.callerId} to ${data.recipientId}`,
    );

    const recipient = this.connectedUsers.get(data.recipientId);

    if (recipient) {
      // Send call request to recipient
      this.server.to(recipient.socketId).emit('incoming-call', {
        callerId: data.callerId,
        callerName: data.callerName,
        callerRole: data.callerRole,
        callType: data.callType,
      });

      // Confirm to caller that request was sent
      client.emit('call-request-sent', { recipientId: data.recipientId });
    } else {
      // Recipient not online
      client.emit('call-request-failed', {
        recipientId: data.recipientId,
        reason: 'User not online',
      });
    }
  }

  @SubscribeMessage('call-accept')
  handleCallAccept(
    @MessageBody() data: { callerId: string; recipientId: string },
    @ConnectedSocket() client: Socket,
  ) {
    this.logger.log(
      `Call accepted by ${data.recipientId} from ${data.callerId}`,
    );

    const caller = this.connectedUsers.get(data.callerId);

    if (caller) {
      // Notify caller that call was accepted
      this.server.to(caller.socketId).emit('call-accepted', {
        recipientId: data.recipientId,
      });
    }
  }

  @SubscribeMessage('call-reject')
  handleCallReject(
    @MessageBody() data: { callerId: string; recipientId: string },
    @ConnectedSocket() client: Socket,
  ) {
    this.logger.log(
      `Call rejected by ${data.recipientId} from ${data.callerId}`,
    );

    const caller = this.connectedUsers.get(data.callerId);

    if (caller) {
      // Notify caller that call was rejected
      this.server.to(caller.socketId).emit('call-rejected', {
        recipientId: data.recipientId,
      });
    }
  }

  @SubscribeMessage('call-end')
  handleCallEnd(
    @MessageBody() data: { callerId: string; recipientId: string },
    @ConnectedSocket() client: Socket,
  ) {
    this.logger.log(
      `Call ended between ${data.callerId} and ${data.recipientId}`,
    );

    const caller = this.connectedUsers.get(data.callerId);
    const recipient = this.connectedUsers.get(data.recipientId);

    // Notify both parties that call ended
    if (caller && caller.socketId !== client.id) {
      this.server.to(caller.socketId).emit('call-ended', {
        otherUserId: data.recipientId,
      });
    }

    if (recipient && recipient.socketId !== client.id) {
      this.server.to(recipient.socketId).emit('call-ended', {
        otherUserId: data.callerId,
      });
    }
  }

  @SubscribeMessage('webrtc-offer')
  handleWebRTCOffer(
    @MessageBody() data: CallOffer,
    @ConnectedSocket() client: Socket,
  ) {
    this.logger.log(
      `WebRTC offer from ${data.callerId} to ${data.recipientId}`,
    );

    const recipient = this.connectedUsers.get(data.recipientId);

    if (recipient) {
      this.server.to(recipient.socketId).emit('webrtc-offer', {
        callerId: data.callerId,
        callerName: data.callerName,
        callerRole: data.callerRole,
        offer: data.offer,
      });
    }
  }

  @SubscribeMessage('webrtc-answer')
  handleWebRTCAnswer(
    @MessageBody() data: CallAnswer,
    @ConnectedSocket() client: Socket,
  ) {
    this.logger.log(
      `WebRTC answer from ${data.recipientId} to ${data.callerId}`,
    );

    const caller = this.connectedUsers.get(data.callerId);

    if (caller) {
      this.server.to(caller.socketId).emit('webrtc-answer', {
        recipientId: data.recipientId,
        answer: data.answer,
      });
    }
  }

  @SubscribeMessage('webrtc-ice-candidate')
  handleICECandidate(
    @MessageBody() data: ICECandidate,
    @ConnectedSocket() client: Socket,
  ) {
    this.logger.log(
      `ICE candidate from ${data.callerId} to ${data.recipientId}`,
    );

    const otherUserId =
      data.recipientId === data.callerId ? data.callerId : data.recipientId;
    const recipient = this.connectedUsers.get(otherUserId);

    if (recipient) {
      this.server.to(recipient.socketId).emit('webrtc-ice-candidate', {
        callerId: data.callerId,
        candidate: data.candidate,
      });
    }
  }

  // Helper method to get online users
  @SubscribeMessage('get-online-users')
  handleGetOnlineUsers(@ConnectedSocket() client: Socket) {
    const onlineUsers = Array.from(this.connectedUsers.values()).map(
      (user) => ({
        userId: user.userId,
        userRole: user.userRole,
        userName: user.userName,
      }),
    );

    client.emit('online-users', onlineUsers);
  }
}
