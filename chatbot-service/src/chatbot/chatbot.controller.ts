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
import { diskStorage } from 'multer';
import { extname } from 'path';
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

@Controller('chatbot')
export class ChatbotController {
  private readonly logger = new Logger(ChatbotController.name);

  constructor(private readonly chatbotService: ChatbotService) {}

  // Small sanitizer to remove control characters and trim
  private sanitize(input: string): string {
    if (!input) return '';
    return input.replace(/[\x00-\x1F\x7F]/g, '').trim();
  }

  // REST API endpoints
  @Post('message')
  async sendMessage(@Body() request: ChatRequest): Promise<ChatResponse> {
    try {
      const { sessionId, userId, message, attachments } = request;
      if (!sessionId || !userId || !message) {
        throw new BadRequestException('sessionId, userId, và message là bắt buộc');
      }

      const sanitized = this.sanitize(message);
      if (sanitized.length === 0) {
        throw new BadRequestException('message không hợp lệ');
      }
      if (sanitized.length > 2000) {
        throw new BadRequestException('message quá dài (tối đa 2000 ký tự)');
      }

      const response = await this.chatbotService.processMessage(sessionId, userId, sanitized, attachments);

      return {
        success: true,
        data: response,
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
      if (!sessionId || !userId) {
        throw new BadRequestException('sessionId và userId là bắt buộc');
      }
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
