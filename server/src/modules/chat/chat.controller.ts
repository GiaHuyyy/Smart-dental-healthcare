import { Body, Controller, Get, Post, Logger } from '@nestjs/common';
import { ChatService, ChatMessage, ChatResponse } from './chat.service';
import { Public } from '../../decorator/customize';

@Controller('chat')
export class ChatController {
  private readonly logger = new Logger(ChatController.name);

  constructor(private readonly chatService: ChatService) {}

  @Public()
  @Post('dental-advice')
  async getDentalAdvice(
    @Body()
    body: {
      message: string;
      chatHistory?: ChatMessage[];
      imageData?: string;
    },
  ): Promise<ChatResponse> {
    const { message, chatHistory = [], imageData } = body;

    this.logger.log(
      `Received dental advice request: ${message.substring(0, 50)}...`,
    );

    return this.chatService.getDentalAdvice(message, chatHistory, imageData);
  }

  @Public()
  @Post('image-chat')
  async processImageWithChat(
    @Body()
    body: {
      message: string;
      imageData: string;
      chatHistory?: ChatMessage[];
    },
  ): Promise<ChatResponse> {
    const { message, imageData, chatHistory = [] } = body;

    this.logger.log('Received image chat request');

    return this.chatService.processImageWithChat(
      message,
      imageData,
      chatHistory,
    );
  }

  @Public()
  @Get('suggested-questions')
  async getSuggestedQuestions(): Promise<{ questions: string[] }> {
    const questions = await this.chatService.getSuggestedQuestions();
    return { questions };
  }

  @Public()
  @Get('health')
  async checkHealth(): Promise<{ status: string; timestamp: string }> {
    const isHealthy = await this.chatService.checkServiceHealth();

    return {
      status: isHealthy ? 'ok' : 'error',
      timestamp: new Date().toISOString(),
    };
  }
}
