import {
    BadRequestException,
    Body,
    Controller,
    Delete,
    Get,
    Logger,
    Param,
    Post,
    UploadedFile,
    UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ConnectedSocket, MessageBody, SubscribeMessage, WebSocketGateway, WebSocketServer, OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit } from '@nestjs/websockets';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { Server, Socket } from 'socket.io';
import { ChatbotService } from './chatbot.service';

interface ChatRequest {
  sessionId: string;
  userId: string;
  message: string;
  attachments?: string[];
}

interface ChatResponse {
  success: boolean;
  data?: any;
  error?: string;
}

@WebSocketGateway({
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling']
})
@Controller('chatbot')
export class ChatbotController implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatbotController.name);

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

  // WebSocket handlers
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

  // REST API endpoints
  @Post('message')
  async sendMessage(@Body() request: ChatRequest): Promise<ChatResponse> {
    try {
      const { sessionId, userId, message, attachments } = request;
      
      if (!sessionId || !userId || !message) {
        throw new BadRequestException('sessionId, userId, và message là bắt buộc');
      }
      
      const response = await this.chatbotService.processMessage(sessionId, userId, message, attachments);
      
      return {
        success: true,
        data: response
      };
    } catch (error) {
      this.logger.error(`Error in sendMessage: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('image', {
    storage: diskStorage({
      destination: './uploads',
      filename: (req, file, callback) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = extname(file.originalname);
        const filename = `${uniqueSuffix}${ext}`;
        callback(null, filename);
      },
    }),
    fileFilter: (req, file, callback) => {
      if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
        return callback(new Error('Chỉ chấp nhận file ảnh!'), false);
      }
      callback(null, true);
    },
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB
    },
  }))
  async uploadImage(
    @UploadedFile() file: Express.Multer.File,
    @Body() data: { sessionId: string; userId: string }
  ): Promise<ChatResponse> {
    try {
      if (!file) {
        throw new BadRequestException('Không có file được upload');
      }
      
      const { sessionId, userId } = data;
      const response = await this.chatbotService.processMessage(sessionId, userId, 'upload_image', [file.path]);
      
      return {
        success: true,
        data: {
          ...response,
          filePath: file.path,
          fileName: file.filename
        }
      };
    } catch (error) {
      this.logger.error(`Error in uploadImage: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }

  @Get('session/:sessionId')
  async getSession(@Param('sessionId') sessionId: string): Promise<ChatResponse> {
    try {
      const session = this.chatbotService.getSession(sessionId);
      
      if (!session) {
        return {
          success: false,
          error: 'Session không tồn tại'
        };
      }
      
      return {
        success: true,
        data: session
      };
    } catch (error) {
      this.logger.error(`Error in getSession: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }

  @Get('sessions')
  async getAllSessions(): Promise<ChatResponse> {
    try {
      const sessions = this.chatbotService.getAllSessions();
      
      return {
        success: true,
        data: sessions
      };
    } catch (error) {
      this.logger.error(`Error in getAllSessions: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }

  @Delete('session/:sessionId')
  async deleteSession(@Param('sessionId') sessionId: string): Promise<ChatResponse> {
    try {
      const deleted = this.chatbotService.deleteSession(sessionId);
      
      if (!deleted) {
        return {
          success: false,
          error: 'Session không tồn tại'
        };
      }
      
      return {
        success: true,
        data: { message: 'Session đã được xóa' }
      };
    } catch (error) {
      this.logger.error(`Error in deleteSession: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }

  @Get('health')
  async healthCheck(): Promise<ChatResponse> {
    return {
      success: true,
      data: {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'Dental Chatbot Service'
      }
    };
  }
}
