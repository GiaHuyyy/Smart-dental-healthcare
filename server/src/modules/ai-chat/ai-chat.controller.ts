import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { Public } from '../../decorator/customize';
import { AiChatService } from './ai-chat.service';

@Controller('ai-chat')
export class AiChatController {
  constructor(private readonly aiChatService: AiChatService) {}

  @Public()
  @Post('advice')
  async getDentalAdvice(
    @Body() body: { message: string; chatHistory?: any[]; sessionId?: string },
  ) {
    return await this.aiChatService.getDentalAdvice(
      body.message,
      body.chatHistory || [],
      body.sessionId,
    );
  }

  @Public()
  @Get('suggestions/:symptom')
  async getQuickSuggestions(@Param('symptom') symptom: string) {
    return await this.aiChatService.getQuickSuggestions(symptom);
  }

  @Public()
  @Post('suggest-doctor')
  async suggestDoctor(@Body() body: { diagnosis?: string; keywords?: string[]; symptom?: string; limit?: number }) {
    return await this.aiChatService.suggestDoctors(body);
  }

  @Public()
  @Post('urgency')
  async analyzeUrgency(@Body() body: { message: string }) {
    const urgency = await this.aiChatService.analyzeUrgency(body.message);
    return { urgency };
  }

  @Public()
  @Post('session/start')
  async startChatSession(@Body() body: { patientId?: string }) {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    return { sessionId, message: 'Phiên chat đã được khởi tạo' };
  }

  @Public()
  @Get('session/:sessionId/context')
  async getSessionContext(@Param('sessionId') sessionId: string) {
    // This would return the current context for the session
    return { sessionId, context: 'Session context would be returned here' };
  }

  @Public()
  @Post('session/:sessionId/end')
  async endChatSession(@Param('sessionId') sessionId: string) {
    // This would clean up the session
    return { sessionId, message: 'Phiên chat đã kết thúc' };
  }

  @Public()
  @Post('analyze')
  async analyzeForDoctor(
    @Body() body: { chatHistory: any[]; patientInfo: any },
  ) {
    // Delegate to service which returns a structured analysis suitable for doctors.
    return await this.aiChatService.analyzeForDoctor(
      body.chatHistory || [],
      body.patientInfo || {},
    );
  }

  @Public()
  @Get('health-check')
  async healthCheck() {
    return { 
      status: 'healthy', 
      timestamp: new Date(),
      service: 'AI Chat Service',
      version: '2.0.0'
    };
  }
}
