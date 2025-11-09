import { GoogleGenerativeAI } from '@google/generative-ai';
import { Injectable } from '@nestjs/common';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { UsersService } from '../users/users.service';

export interface ChatContext {
  patientId?: string;
  sessionId: string;
  conversationType: 'initial' | 'symptom' | 'analysis' | 'booking' | 'followup';
  urgencyLevel: 'low' | 'medium' | 'high';
  suggestedDoctors: any[];
  symptoms: string[];
  lastInteraction: Date;
}

export interface EnhancedAiResponse {
  message: string;
  suggestedDoctor: any | null;
  timestamp: Date;
  context: Partial<ChatContext>;
  quickActions?: string[];
  followUpQuestions?: string[];
  urgencyLevel: 'low' | 'medium' | 'high';
  confidence: number;
  nextSteps?: string[];
}

@Injectable()
export class AiChatService {
  private genAI: GoogleGenerativeAI;
  private model: any;
  private chatSessions: Map<string, ChatContext> = new Map();

  constructor(
    private usersService: UsersService,
    private cloudinaryService: CloudinaryService,
  ) {
    this.genAI = new GoogleGenerativeAI(
      process.env.GEMINI_API_KEY || 'your-gemini-api-key-here',
    );
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
  }

  private getKeywordsForSpecialty(specialty: string): string[] {
    const specialtyKeywords: { [key: string]: string[] } = {
      'nha khoa tổng quát': [
        'sâu răng',
        'ê buốt',
        'đau răng',
        'khám tổng quát',
      ],
      'chỉnh nha': [
        'mọc lệch',
        'chen chúc',
        'khớp cắn sai',
        'niềng răng',
        'chỉnh nha',
      ],
      'thẩm mỹ răng': [
        'ố vàng',
        'xỉn màu',
        'không đều đẹp',
        'tẩy trắng',
        'thẩm mỹ',
      ],
      'phẫu thuật hàm mặt': [
        'hàm hô',
        'hàm móm',
        'chấn thương',
        'phẫu thuật',
        'răng khôn',
      ],
      'nha chu': ['chảy máu lợi', 'chải răng', 'viêm nướu', 'nha chu'],
      'nha khoa trẻ em': [
        'răng sữa sâu',
        'trẻ đau răng',
        'sợ đi khám',
        'trẻ em',
      ],
      'cấy ghép implant': ['implant', 'cấy ghép', 'mất răng'],
      'nội nha': ['tủy răng', 'điều trị tủy', 'viêm tủy'],
    };

    const lowerSpecialty = specialty.toLowerCase();
    for (const [key, keywords] of Object.entries(specialtyKeywords)) {
      if (lowerSpecialty.includes(key)) {
        return keywords;
      }
    }
    return ['tổng quát'];
  }

  private async getDoctorsFromDatabase() {
    try {
      const doctors = await this.usersService.findDoctors();

      // Return DB doctor records but attach computed keywords so callers can match suggestions
      return doctors.map((doctor) => ({
        _id: doctor._id,
        fullName: doctor.fullName,
        email: doctor.email,
        phone: doctor.phone,
        specialty: doctor.specialty || 'Nha khoa tổng quát',
        keywords: this.getKeywordsForSpecialty(doctor.specialty || ''),
      }));
    } catch (error) {
      console.error('❌ Failed to fetch doctors from database:', error);
      console.log('🔄 No fallback data - returning empty array');
      // No fallback data - return empty array to force proper error handling
      return [];
    }
  }

  async getDentalAdvice(
    userMessage: string,
    chatHistory: any[] = [],
    sessionId?: string,
  ): Promise<EnhancedAiResponse> {
    // Get or create chat context
    const context = this.getOrCreateContext(sessionId);

    // Update context based on message
    this.updateContext(context, userMessage, chatHistory);

    // Get doctors from database
    const doctors = await this.getDoctorsFromDatabase();

    const systemPrompt = this.buildEnhancedSystemPrompt(doctors, context);

    try {
      // Prepare conversation context for Gemini
      let conversationContext = systemPrompt + '\n\nLịch sử trò chuyện:\n';

      // Add chat history with context
      chatHistory.forEach((msg, index) => {
        conversationContext += `${msg.role === 'user' ? 'Bệnh nhân' : 'AI'}: ${msg.content}\n`;
        if (index === chatHistory.length - 1) {
          conversationContext += `[Context: ${context.conversationType}, Urgency: ${context.urgencyLevel}]\n`;
        }
      });

      // Add current message
      conversationContext += `\nBệnh nhân hiện tại hỏi: ${userMessage}\n\nTrả lời:`;

      const result = await this.model.generateContent(conversationContext);
      const response = await result.response;
      const aiResponse: string = response.text();

      // Enhanced analysis
      const urgencyLevel = await this.analyzeUrgency(userMessage);
      const suggestedDoctor = await this.extractDoctorSuggestion(
        aiResponse,
        context,
      );
      const quickActions = this.generateQuickActions(context, aiResponse);
      const followUpQuestions = this.generateFollowUpQuestions(
        context,
        aiResponse,
      );
      const nextSteps = this.generateNextSteps(context, urgencyLevel);

      // Update context
      context.urgencyLevel = urgencyLevel;
      context.lastInteraction = new Date();
      if (suggestedDoctor) {
        context.suggestedDoctors.push(suggestedDoctor);
      }

      return {
        message: aiResponse,
        suggestedDoctor,
        timestamp: new Date(),
        context: {
          conversationType: context.conversationType,
          urgencyLevel: context.urgencyLevel,
          suggestedDoctors: context.suggestedDoctors,
          symptoms: context.symptoms,
        },
        quickActions,
        followUpQuestions,
        urgencyLevel,
        confidence: this.calculateConfidence(aiResponse, context),
        nextSteps,
      };
    } catch (error) {
      console.error('Gemini API Error:', error);
      return {
        message:
          'Xin lỗi, tôi đang gặp sự cố kỹ thuật. Vui lòng thử lại sau hoặc liên hệ trực tiếp với phòng khám.',
        suggestedDoctor: null,
        timestamp: new Date(),
        context: { conversationType: 'initial', urgencyLevel: 'low' },
        quickActions: ['Thử lại', 'Gọi điện', 'Liên hệ hỗ trợ'],
        urgencyLevel: 'low',
        confidence: 0,
      };
    }
  }

  private getOrCreateContext(sessionId?: string): ChatContext {
    const id = sessionId || `session_${Date.now()}`;

    if (!this.chatSessions.has(id)) {
      this.chatSessions.set(id, {
        sessionId: id,
        conversationType: 'initial',
        urgencyLevel: 'low',
        suggestedDoctors: [],
        symptoms: [],
        lastInteraction: new Date(),
      });
    }

    return this.chatSessions.get(id)!;
  }

  private updateContext(
    context: ChatContext,
    message: string,
    chatHistory: any[],
  ) {
    // Analyze message to update context
    const lowerMessage = message.toLowerCase();

    // Update conversation type
    if (
      lowerMessage.includes('đau') ||
      lowerMessage.includes('sưng') ||
      lowerMessage.includes('chảy máu')
    ) {
      context.conversationType = 'symptom';
    } else if (
      lowerMessage.includes('phân tích') ||
      lowerMessage.includes('x-quang')
    ) {
      context.conversationType = 'analysis';
    } else if (
      lowerMessage.includes('đặt lịch') ||
      lowerMessage.includes('khám')
    ) {
      context.conversationType = 'booking';
    }

    // Extract symptoms
    const symptomKeywords = [
      'đau răng',
      'sưng nướu',
      'chảy máu',
      'răng khôn',
      'sâu răng',
      'viêm nướu',
    ];
    symptomKeywords.forEach((symptom) => {
      if (
        lowerMessage.includes(symptom) &&
        !context.symptoms.includes(symptom)
      ) {
        context.symptoms.push(symptom);
      }
    });
  }

  private buildEnhancedSystemPrompt(
    doctors: any[],
    context: ChatContext,
  ): string {
    return `
Bạn là một trợ lý AI chuyên về nha khoa tại Smart Dental Healthcare, một phòng khám nha khoa tại Việt Nam.

NHIỆM VỤ:
1. Tư vấn sơ bộ về các vấn đề răng miệng
2. Phân tích triệu chứng và đưa ra gợi ý
3. Gợi ý bác sĩ phù hợp nếu cần thiết
4. Hướng dẫn chăm sóc răng miệng cơ bản
5. Hỗ trợ đặt lịch khám và theo dõi

QUY TẮC:
- Luôn trả lời bằng tiếng Việt
- Không thay thế ý kiến bác sĩ chuyên khoa
- Đưa ra lời khuyên an toàn, thận trọng
- Nếu nghiêm trọng, khuyên đến gặp bác sĩ ngay
- Thân thiện, dễ hiểu, chuyên nghiệp
- Dựa trên context cuộc trò chuyện để đưa ra phản hồi phù hợp

CONTEXT HIỆN TẠI:
- Loại cuộc trò chuyện: ${context.conversationType}
- Mức độ khẩn cấp: ${context.urgencyLevel}
- Triệu chứng đã đề cập: ${context.symptoms.join(', ') || 'Chưa có'}

CÁC BÁC SĨ CHUYÊN KHOA:
${doctors.map((d) => `- ${d.fullName}: ${d.specialty}`).join('\n')}

CHUYÊN KHOA CHÍNH:
1. **Nha khoa tổng quát**: Khám tổng quát, tư vấn chung
2. **Chỉnh nha**: Niềng răng, chỉnh hình răng
3. **Thẩm mỹ răng**: Tẩy trắng, bọc sứ, veneer
4. **Phẫu thuật hàm mặt**: Nhổ răng khôn, phẫu thuật
5. **Nha khoa trẻ em**: Chăm sóc răng trẻ em
6. **Nha chu**: Điều trị nướu, viêm lợi
7. **Cấy ghép implant**: Thay thế răng mất
8. **Nội nha**: Điều trị tủy răng

FORMAT TRẢ LỜI:
1. Phân tích triệu chứng (nếu có)
2. Tư vấn sơ bộ
3. Gợi ý bác sĩ (nếu cần)
4. Lời khuyên chăm sóc
5. Hướng dẫn tiếp theo

Hãy trả lời ngắn gọn, súc tích nhưng đầy đủ thông tin.`;
  }

  private generateQuickActions(
    context: ChatContext,
    aiResponse: string,
  ): string[] {
    const actions: string[] = [];

    if (context.conversationType === 'symptom') {
      actions.push(
        '📸 Chụp ảnh triệu chứng',
        '👨‍⚕️ Tư vấn bác sĩ',
        '📅 Đặt lịch khám',
      );
    } else if (context.conversationType === 'analysis') {
      actions.push(
        '🔍 Phân tích chi tiết',
        '👨‍⚕️ Gợi ý bác sĩ',
        '📋 Tạo báo cáo',
      );
    } else if (context.conversationType === 'booking') {
      actions.push(
        '📅 Xem lịch trống',
        '📞 Gọi đặt lịch',
        '💳 Thanh toán online',
      );
    }

    actions.push('🏠 Hướng dẫn chăm sóc', '❓ Câu hỏi khác');

    return actions;
  }

  private generateFollowUpQuestions(
    context: ChatContext,
    aiResponse: string,
  ): string[] {
    const questions: string[] = [];

    if (context.conversationType === 'initial') {
      questions.push(
        'Bạn có triệu chứng gì cụ thể không?',
        'Bạn đã từng điều trị nha khoa chưa?',
      );
    } else if (context.conversationType === 'symptom') {
      questions.push(
        'Triệu chứng này kéo dài bao lâu rồi?',
        'Bạn có bị đau khi ăn uống không?',
      );
    }

    return questions;
  }

  private generateNextSteps(
    context: ChatContext,
    urgencyLevel: string,
  ): string[] {
    const steps: string[] = [];

    if (urgencyLevel === 'high') {
      steps.push('Liên hệ phòng khám ngay', 'Đến cơ sở y tế gần nhất');
    } else if (urgencyLevel === 'medium') {
      steps.push('Đặt lịch khám trong tuần', 'Theo dõi triệu chứng');
    } else {
      steps.push('Duy trì vệ sinh răng miệng', 'Khám định kỳ 6 tháng/lần');
    }

    return steps;
  }

  private calculateConfidence(
    aiResponse: string,
    context: ChatContext,
  ): number {
    let confidence = 0.7; // Base confidence

    // Increase confidence based on context
    if (context.symptoms.length > 0) confidence += 0.1;
    if (context.conversationType !== 'initial') confidence += 0.1;
    if (aiResponse.length > 100) confidence += 0.1;

    return Math.min(confidence, 1.0);
  }

  private async extractDoctorSuggestion(
    aiResponse: string,
    context: ChatContext,
  ): Promise<any> {
    // Get current doctors from database
    const doctors = await this.getDoctorsFromDatabase();

    for (const doctor of doctors) {
      if (
        doctor.keywords.some((keyword) =>
          aiResponse.toLowerCase().includes(keyword),
        )
      ) {
        return doctor;
      }
    }

    return null;
  }

  async getQuickSuggestions(symptom: string) {
    const doctors = await this.getDoctorsFromDatabase();

    const baseSuggestions = {
      'sâu răng': [
        'Súc miệng bằng nước muối ấm',
        'Tránh đồ ngọt và lạnh',
        'Sử dụng thuốc giảm đau theo chỉ định',
      ],
      'mọc lệch': [
        'Thăm khám để đánh giá tình trạng',
        'Chụp X-quang toàn hàm',
        'Tư vấn phương án chỉnh nha',
      ],
      'ố vàng': [
        'Hạn chế cà phê, trà, thuốc lá',
        'Đánh răng đúng cách 2 lần/ngày',
        'Tư vấn phương pháp tẩy trắng',
      ],
      'hàm hô': [
        'Thăm khám chuyên khoa',
        'Đánh giá mức độ nghiêm trọng',
        'Tư vấn phương án điều trị',
      ],
      'chảy máu lợi': [
        'Đánh răng nhẹ nhàng',
        'Sử dụng chỉ nha khoa',
        'Súc miệng bằng nước muối',
      ],
      'răng sữa': [
        'Giữ vệ sinh răng miệng cho trẻ',
        'Tạo tâm lý tích cực cho trẻ',
        'Thăm khám định kỳ',
      ],
    };

    const suggestions = Object.keys(baseSuggestions).reduce(
      (acc, key) => {
        if (symptom.toLowerCase().includes(key)) {
          return baseSuggestions[key];
        }
        return acc;
      },
      [
        'Duy trì vệ sinh răng miệng tốt',
        'Đánh răng 2 lần/ngày',
        'Khám răng định kỳ 6 tháng/lần',
      ],
    );

    // Add real doctor suggestion if available
    if (doctors.length > 0) {
      const appropriateDoctor =
        doctors.find((doctor) => {
          const keywords = doctor.keywords || [];
          const symptomLower = symptom.toLowerCase();
          return keywords.some((keyword) => symptomLower.includes(keyword));
        }) || doctors[0];

      suggestions.push(`Tư vấn với ${appropriateDoctor.fullName}`);
    } else {
      suggestions.push('Liên hệ phòng khám để được tư vấn cụ thể');
    }

    return suggestions;
  }

  /**
   * Analyze chat history and patient info to produce a structured report for doctors.
   * Returns: { summary, urgency, suggestedActions, recommendedSpecialist, rawModelOutput }
   */
  async analyzeForDoctor(chatHistory: any[] = [], patientInfo: any = {}) {
    const systemPrompt = `Bạn là một trợ lý AI hỗ trợ bác sĩ, hãy phân tích lịch sử hội thoại và thông tin bệnh nhân rồi trả về 1 JSON có các trường: summary (ngắn gọn), urgency (high|medium|low), suggestedActions (mảng chuỗi), recommendedSpecialist (tên hoặc null). Trả CHỈ mỗi nội dung JSON, không kèm giải thích.`;

    // Build conversation text
    let convo = systemPrompt + '\n\nLịch sử trò chuyện:\n';
    chatHistory.forEach((m) => {
      convo += `${m.role === 'user' ? 'Bệnh nhân' : 'AI'}: ${m.content}\n`;
    });

    convo +=
      '\nThông tin bệnh nhân:\n' + JSON.stringify(patientInfo) + '\n\nJSON:';

    try {
      const result = await this.model.generateContent(convo);
      const response = await result.response;
      const text = response.text();

      // Try to extract JSON from model output
      const jsonTextMatch = text.match(/\{[\s\S]*\}/);
      let parsed: any = null;
      if (jsonTextMatch) {
        try {
          parsed = JSON.parse(jsonTextMatch[0]);
        } catch (e) {
          // fallback: attempt to eval-ish by replacing single quotes
          try {
            const safe = jsonTextMatch[0].replace(/\n/g, ' ');
            parsed = JSON.parse(safe.replace(/'/g, '"'));
          } catch (e2) {
            parsed = null;
          }
        }
      }

      // Validate shape and provide defaults
      const safeResponse = {
        summary: parsed?.summary || this.summarizeText(text, 120),
        urgency: parsed?.urgency || (await this.analyzeUrgency(text)),
        suggestedActions: parsed?.suggestedActions || [
          'Clinical assessment',
          'Consider X-ray',
          'Provide symptomatic care',
        ],
        recommendedSpecialist: parsed?.recommendedSpecialist || null,
        rawModelOutput: text,
      };

      return safeResponse;
    } catch (error) {
      console.error('analyzeForDoctor error:', error);
      return {
        summary: 'Không thể phân tích vào lúc này',
        urgency: 'low',
        suggestedActions: ['Xin thử lại sau', 'Liên hệ phòng khám nếu cần'],
        recommendedSpecialist: null,
        rawModelOutput: null,
      };
    }
  }

  private summarizeText(text: string, maxLen = 140) {
    if (!text) return '';
    const cleaned = text.replace(/\s+/g, ' ').trim();
    if (cleaned.length <= maxLen) return cleaned;
    return cleaned.slice(0, maxLen).trim() + '...';
  }

  async analyzeUrgency(message: string): Promise<'high' | 'medium' | 'low'> {
    const urgentKeywords = [
      'đau dữ dội',
      'sưng mặt',
      'sốt',
      'chảy máu không ngừng',
      'gãy răng',
      'vỡ răng',
      'chấn thương nghiêm trọng',
    ];
    const mediumKeywords = [
      'đau răng',
      'ê buốt',
      'sưng nướu',
      'chảy máu lợi',
      'răng mọc lệch',
      'răng sâu',
    ];

    const lowerMessage = message.toLowerCase();

    if (urgentKeywords.some((keyword) => lowerMessage.includes(keyword))) {
      return 'high';
    }

    if (mediumKeywords.some((keyword) => lowerMessage.includes(keyword))) {
      return 'medium';
    }

    return 'low';
  }

  /**
   * Suggest doctors using server database. Input may contain a diagnosis string, array of keywords, or symptom.
   * Returns an array of doctor records sorted by match score.
   */
  async suggestDoctors(opts: {
    diagnosis?: string;
    keywords?: string[];
    symptom?: string;
    limit?: number;
  }) {
    const doctors = await this.getDoctorsFromDatabase();
    const terms: string[] = [];
    if (opts.diagnosis)
      terms.push(...opts.diagnosis.toLowerCase().split(/\W+/));
    if (opts.symptom) terms.push(...opts.symptom.toLowerCase().split(/\W+/));
    if (opts.keywords && Array.isArray(opts.keywords))
      terms.push(...opts.keywords.map((k) => k.toLowerCase()));

    // Score doctors by keyword overlap
    const scored = doctors.map((d) => {
      const docKeywords = (d.keywords || []).map((k: string) =>
        k.toLowerCase(),
      );
      let score = 0;
      for (const t of terms) {
        if (!t) continue;
        if (docKeywords.includes(t)) score += 2;
        else if (d.specialty && d.specialty.toLowerCase().includes(t))
          score += 1;
      }
      return { doctor: d, score };
    });

    scored.sort((a, b) => b.score - a.score);
    const limit = opts.limit && opts.limit > 0 ? opts.limit : 5;
    return scored
      .filter((s) => s.score > 0)
      .slice(0, limit)
      .map((s) => s.doctor);
  }
}
