import { Logger } from '@nestjs/common';
import { ConnectedSocket, MessageBody, OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatbotService } from './chatbot.service';

interface ChatRequest {
  sessionId: string;
  userId: string;
  message: string;
  attachments?: string[];
}

@WebSocketGateway({
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
  namespace: '/'
})
export class ChatbotGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatbotGateway.name);

  constructor(private readonly chatbotService: ChatbotService) {}

  afterInit() {
    this.logger.log('Socket.IO gateway initialized');
    if (this.server) {
      this.server.on('error', (err) => this.logger.error(`Socket.IO server error: ${err?.message || err}`));
    }
  }

  handleConnection(client: Socket) {
    const addr = (client.handshake && client.handshake.address) || (client.conn && (client.conn.remoteAddress));
    this.logger.log(`Client connected: id=${client.id} address=${addr}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: id=${client.id}`);
  }

  @SubscribeMessage('join')
  handleJoin(@MessageBody() data: { sessionId: string; userId: string }, @ConnectedSocket() client: Socket) {
    const sessionId = data?.sessionId;
    const userId = data?.userId;

    if (!sessionId || !userId) {
      client.emit('error', { message: 'sessionId và userId là bắt buộc khi join' });
      return;
    }

    client.join(sessionId);
    this.logger.log(`Client ${userId} joined session ${sessionId}`);
    // Gửi typing event -> response
    this.server.to(sessionId).emit('typing', { typing: true });
    this.chatbotService.processMessage(sessionId, userId, 'xin chào')
      .then(response => {
        this.server.to(sessionId).emit('message', {
          type: 'bot',
          content: response.message,
          timestamp: new Date(),
          options: response.options,
          richContent: response.richContent
        });
      })
      .catch(err => {
        this.logger.error(`Failed to process welcome message: ${err?.message || err}`);
        client.emit('error', { message: 'Không thể gửi lời chào' });
      })
      .finally(() => {
        this.server.to(sessionId).emit('typing', { typing: false });
      });
  }

  @SubscribeMessage('message')
  async handleMessage(@MessageBody() data: ChatRequest, @ConnectedSocket() client: Socket) {
    try {
      const sessionId = data?.sessionId;
      const userId = data?.userId;
      const message = data?.message;
      const attachments = data?.attachments;

      if (!sessionId || !userId || typeof message !== 'string') {
        client.emit('error', { message: 'sessionId, userId, và message là bắt buộc' });
        return;
      }

      // Emit typing indicator for UX
      this.server.to(sessionId).emit('typing', { typing: true });

      // Xử lý message
      const response = await this.chatbotService.processMessage(sessionId, userId, message, attachments);

      // Gửi response về client
      this.server.to(sessionId).emit('message', {
        type: 'bot',
        content: response.message,
        timestamp: new Date(),
        options: response.options,
        analysisResult: response.analysisResult,
        richContent: response.richContent
      });
      this.server.to(sessionId).emit('typing', { typing: false });
      
    } catch (error) {
      this.logger.error(`Error processing message: ${error.message}`);
      client.emit('error', { message: 'Có lỗi xảy ra khi xử lý tin nhắn' });
    }
  }

  @SubscribeMessage('upload_image')
  async handleImageUpload(@MessageBody() data: { sessionId: string; userId: string; imagePath: string }, @ConnectedSocket() client: Socket) {
    try {
      const sessionId = data?.sessionId;
      const userId = data?.userId;
      const imagePath = data?.imagePath;

      if (!sessionId || !userId || !imagePath) {
        client.emit('error', { message: 'sessionId, userId và imagePath là bắt buộc' });
        return;
      }

      // Emit typing indicator for UX
      this.server.to(sessionId).emit('typing', { typing: true });

      // Xử lý upload ảnh
      const response = await this.chatbotService.processMessage(sessionId, userId, 'upload_image', [imagePath]);

      // Gửi response về client
      this.server.to(sessionId).emit('message', {
        type: 'bot',
        content: response.message,
        timestamp: new Date(),
        options: response.options,
        analysisResult: response.analysisResult,
        richContent: response.richContent
      });
      this.server.to(sessionId).emit('typing', { typing: false });
      
    } catch (error) {
  this.logger.error(`Error processing image upload: ${error?.message || error}`);
  client.emit('error', { message: 'Có lỗi xảy ra khi xử lý ảnh' });
    }
  }
}

