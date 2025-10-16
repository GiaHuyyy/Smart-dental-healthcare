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
  @Get('suggestions')
  async getTreatmentSuggestions() {
    // Return structured suggestions for treatment modal
    return {
      chiefComplaints: [
        'Đau răng',
        'Chảy máu chân răng',
        'Viêm nướu',
        'Sâu răng',
        'Ê buốt răng',
        'Răng lung lay',
        'Hôi miệng',
        'Mòn men răng',
        'Răng khôn mọc lệch',
        'Tụt lợi',
      ],
      diagnoses: [
        'Viêm nướu',
        'Viêm tủy răng',
        'Sâu răng',
        'Viêm quanh răng',
        'Áp xe răng',
        'Tổn thương tủy',
        'Mất men răng',
        'Răng khôn mọc ngầm',
        'Viêm quanh cuống răng',
        'Tụt lợi',
      ],
      treatmentPlans: [
        'Lấy cao răng',
        'Hàn răng',
        'Nhổ răng',
        'Điều trị tủy',
        'Bọc răng sứ',
        'Cạo vôi răng',
        'Phẫu thuật nha chu',
        'Điều trị nội nha',
        'Hướng dẫn vệ sinh răng miệng',
        'Tái khám định kỳ',
      ],
      medications: [
        'Metronidazole 250mg',
        'Amoxicillin 500mg',
        'Ibuprofen 400mg',
        'Paracetamol 500mg',
        'Nước súc miệng Chlorhexidine',
        'Gel bôi nướu',
        'Vitamin C',
        'Kháng sinh Cefixime',
      ],
      diagnosisTreatmentMap: {
        'Viêm nướu': [
          'Lấy cao răng',
          'Cạo vôi răng',
          'Hướng dẫn vệ sinh răng miệng',
        ],
        'Viêm tủy răng': ['Điều trị tủy', 'Hàn răng', 'Bọc răng sứ'],
        'Sâu răng': ['Hàn răng', 'Điều trị tủy', 'Nhổ răng'],
        'Viêm quanh răng': [
          'Lấy cao răng',
          'Phẫu thuật nha chu',
          'Hướng dẫn vệ sinh răng miệng',
        ],
        'Áp xe răng': ['Dẫn lưu', 'Điều trị tủy', 'Nhổ răng'],
        'Răng khôn mọc ngầm': ['Nhổ răng khôn', 'Phẫu thuật nhổ răng'],
      },
      diagnosisMedicationMap: {
        'Viêm nướu': [
          {
            name: 'Metronidazole 250mg',
            dosage: '250mg',
            frequency: '3 lần/ngày',
            duration: '7 ngày',
            instructions: 'Uống sau ăn',
          },
          {
            name: 'Nước súc miệng Chlorhexidine',
            dosage: '10ml',
            frequency: '2 lần/ngày',
            duration: '14 ngày',
            instructions: 'Súc miệng sau đánh răng',
          },
        ],
        'Viêm tủy răng': [
          {
            name: 'Amoxicillin 500mg',
            dosage: '500mg',
            frequency: '3 lần/ngày',
            duration: '7 ngày',
            instructions: 'Uống sau ăn',
          },
          {
            name: 'Ibuprofen 400mg',
            dosage: '400mg',
            frequency: 'Khi đau',
            duration: '5 ngày',
            instructions: 'Uống khi đau',
          },
        ],
        'Sâu răng': [
          {
            name: 'Paracetamol 500mg',
            dosage: '500mg',
            frequency: 'Khi đau',
            duration: '3 ngày',
            instructions: 'Uống khi đau',
          },
        ],
        'Viêm quanh răng': [
          {
            name: 'Metronidazole 250mg',
            dosage: '250mg',
            frequency: '3 lần/ngày',
            duration: '7 ngày',
            instructions: 'Uống sau ăn',
          },
          {
            name: 'Nước súc miệng Chlorhexidine',
            dosage: '10ml',
            frequency: '2 lần/ngày',
            duration: '14 ngày',
            instructions: 'Súc miệng sau đánh răng',
          },
          {
            name: 'Vitamin C',
            dosage: '500mg',
            frequency: '1 lần/ngày',
            duration: '30 ngày',
            instructions: 'Uống sau ăn sáng',
          },
        ],
        'Áp xe răng': [
          {
            name: 'Amoxicillin 500mg',
            dosage: '500mg',
            frequency: '3 lần/ngày',
            duration: '7 ngày',
            instructions: 'Uống sau ăn',
          },
          {
            name: 'Ibuprofen 400mg',
            dosage: '400mg',
            frequency: '3 lần/ngày',
            duration: '5 ngày',
            instructions: 'Uống sau ăn',
          },
        ],
      },
      treatmentMedicationMap: {
        'Lấy cao răng': [
          {
            name: 'Nước súc miệng Chlorhexidine',
            dosage: '10ml',
            frequency: '2 lần/ngày',
            duration: '7 ngày',
            instructions: 'Súc miệng sau đánh răng',
          },
        ],
        'Nhổ răng': [
          {
            name: 'Amoxicillin 500mg',
            dosage: '500mg',
            frequency: '3 lần/ngày',
            duration: '5 ngày',
            instructions: 'Uống sau ăn',
          },
          {
            name: 'Ibuprofen 400mg',
            dosage: '400mg',
            frequency: 'Khi đau',
            duration: '3 ngày',
            instructions: 'Uống khi đau',
          },
        ],
        'Điều trị tủy': [
          {
            name: 'Amoxicillin 500mg',
            dosage: '500mg',
            frequency: '3 lần/ngày',
            duration: '7 ngày',
            instructions: 'Uống sau ăn',
          },
          {
            name: 'Ibuprofen 400mg',
            dosage: '400mg',
            frequency: 'Khi đau',
            duration: '5 ngày',
            instructions: 'Uống khi đau',
          },
        ],
        'Cạo vôi răng': [
          {
            name: 'Nước súc miệng Chlorhexidine',
            dosage: '10ml',
            frequency: '2 lần/ngày',
            duration: '14 ngày',
            instructions: 'Súc miệng sau đánh răng',
          },
          {
            name: 'Gel bôi nướu',
            dosage: 'Bôi mỏng',
            frequency: '2 lần/ngày',
            duration: '7 ngày',
            instructions: 'Bôi lên nướu sau khi đánh răng',
          },
        ],
      },
    };
  }

  @Public()
  @Post('suggest-doctor')
  async suggestDoctor(
    @Body()
    body: {
      diagnosis?: string;
      keywords?: string[];
      symptom?: string;
      limit?: number;
    },
  ) {
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
      version: '2.0.0',
    };
  }
}
