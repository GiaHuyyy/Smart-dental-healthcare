import { Controller, Post, Body, UseGuards, Get, Param } from '@nestjs/common';
import { AiChatService } from './ai-chat.service';
import { JwtAuthGuard } from '../../auth/passport/jwt-auth.guard';
import { Public } from '../../decorator/customize';

@Controller('ai-chat')
export class AiChatController {
  constructor(private readonly aiChatService: AiChatService) {}

  @Public()
  @Post('advice')
  async getDentalAdvice(
    @Body() body: { message: string; chatHistory?: any[] },
  ) {
    return await this.aiChatService.getDentalAdvice(
      body.message,
      body.chatHistory || [],
    );
  }

  @Public()
  @Get('suggestions/:symptom')
  async getQuickSuggestions(@Param('symptom') symptom: string) {
    return await this.aiChatService.getQuickSuggestions(symptom);
  }

  @Public()
  @Post('urgency')
  async analyzeUrgency(@Body() body: { message: string }) {
    const urgency = await this.aiChatService.analyzeUrgency(body.message);
    return { urgency };
  }

  @Post('analyze')
  @UseGuards(JwtAuthGuard)
  async analyzeForDoctor(
    @Body() body: { chatHistory: any[]; patientInfo: any },
  ) {
    // This would analyze chat history to provide insights for doctors
    return {
      summary: 'Patient reports tooth pain for 3 days',
      urgency: 'medium',
      suggestedActions: [
        'X-ray examination',
        'Pain management',
        'Schedule follow-up',
      ],
      recommendedSpecialist: 'BS. Nguyễn Văn A',
    };
  }
}
