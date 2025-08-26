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
    const { sessionId, userId } = data;
    client.join(sessionId);
    this.logger.log(`Client ${userId} joined session ${sessionId}`);
    
    // Gửi welcome message
    this.chatbotService.processMessage(sessionId, userId, 'xin chào')
      .then(response => {
        this.server.to(sessionId).emit('message', {
          type: 'bot',
          content: response.message,
          timestamp: new Date(),
          options: response.options
        });
      });
  }

  @SubscribeMessage('message')
  async handleMessage(@MessageBody() data: ChatRequest, @ConnectedSocket() client: Socket) {
    try {
      const { sessionId, userId, message, attachments } = data;
      
      // Xử lý message
      const response = await this.chatbotService.processMessage(sessionId, userId, message, attachments);
      
      // Gửi response về client
      this.server.to(sessionId).emit('message', {
        type: 'bot',
        content: response.message,
        timestamp: new Date(),
        options: response.options,
        analysisResult: response.analysisResult
      });
      
    } catch (error) {
      this.logger.error(`Error processing message: ${error.message}`);
      client.emit('error', { message: 'Có lỗi xảy ra khi xử lý tin nhắn' });
    }
  }

  @SubscribeMessage('upload_image')
  async handleImageUpload(@MessageBody() data: { sessionId: string; userId: string; imagePath: string }, @ConnectedSocket() client: Socket) {
    try {
      const { sessionId, userId, imagePath } = data;
      
      // Xử lý upload ảnh
      const response = await this.chatbotService.processMessage(sessionId, userId, 'upload_image', [imagePath]);
      
      // Gửi response về client
      this.server.to(sessionId).emit('message', {
        type: 'bot',
        content: response.message,
        timestamp: new Date(),
        options: response.options,
        analysisResult: response.analysisResult
      });
      
    } catch (error) {
      this.logger.error(`Error processing image upload: ${error.message}`);
      client.emit('error', { message: 'Có lỗi xảy ra khi xử lý ảnh' });
    }
  }
}

