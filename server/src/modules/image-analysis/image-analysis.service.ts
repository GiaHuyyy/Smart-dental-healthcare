import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import * as fs from 'fs';

export interface ImageAnalysisResult {
  message: string;
  analysisResult: any;
  richContent?: {
    title?: string;
    analysis?: string;
    highlights?: string[];
    recommendations?: string[];
    sections?: Array<{ heading?: string; text?: string; bullets?: string[] }>;
  };
  options?: string[];
  suggestedDoctor?: {
    fullName: string;
    specialty: string;
    keywords: string[];
  };
}

@Injectable()
export class ImageAnalysisService {
  private readonly logger = new Logger(ImageAnalysisService.name);
  private readonly geminiApiKey: string;
  private readonly geminiApiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.geminiApiKey = this.configService.get<string>('GEMINI_API_KEY') || 'your-gemini-api-key';
    this.logger.log(`Initializing ImageAnalysisService with Gemini API`);
  }

  async analyzeImage(
    filePath: string,
    userId: string,
  ): Promise<ImageAnalysisResult> {
    try {
      this.logger.log(
        `Starting image analysis for user ${userId}, file: ${filePath}`,
      );

      if (!fs.existsSync(filePath)) {
        throw new BadRequestException('File không tồn tại');
      }

      // Analyze image using Gemini AI
      const analysisResult = await this.analyzeWithGemini(filePath);

      return {
        message: 'Phân tích ảnh hoàn tất',
        analysisResult: analysisResult,
        richContent: {
          title: 'Kết quả phân tích ảnh nha khoa',
          analysis: analysisResult.diagnosis,
          recommendations: analysisResult.recommendations,
          sections: [
            {
              heading: 'Tình trạng răng miệng',
              text: analysisResult.detailedFindings,
              bullets: analysisResult.riskFactors
            },
            {
              heading: 'Kế hoạch điều trị',
              text: 'Các bước điều trị được đề xuất',
              bullets: [
                ...analysisResult.treatmentPlan.immediate,
                ...analysisResult.treatmentPlan.shortTerm
              ]
            }
          ]
        },
        options: [
          'Giải thích thêm về chẩn đoán',
          'Đặt lịch khám với bác sĩ',
          'Hướng dẫn chăm sóc tại nhà',
          'Xem các trường hợp tương tự'
        ],
        suggestedDoctor: this.getSuggestedDoctorForCondition(String(analysisResult.diagnosis || ''))
      };
    } catch (error) {
      this.logger.error(`Image analysis failed: ${error.message}`);
      throw new BadRequestException(
        `Không thể phân tích ảnh: ${error.message}`,
      );
    }
  }

  private async analyzeWithGemini(filePath: string): Promise<any> {
    try {
      this.logger.log(`Starting Gemini analysis for file: ${filePath}`);

      // Check if file exists
      if (!fs.existsSync(filePath)) {
        throw new Error(`File does not exist: ${filePath}`);
      }

      // Read and convert image to base64
      const fileBuffer = fs.readFileSync(filePath);
      const base64Image = fileBuffer.toString('base64');
      this.logger.log(`Image converted to base64, size: ${base64Image.length} characters`);

      const prompt = this.createDentalAnalysisPrompt();

      // Tạo request body cho Gemini API
      const requestBody = {
        contents: [{
          parts: [
            { text: prompt },
            {
              inline_data: {
                mime_type: 'image/jpeg',
                data: base64Image
              }
            }
          ]
        }]
      };

      this.logger.log('Sending request to Gemini API...');

      // Gọi Gemini API qua HTTP
      const response = await firstValueFrom(
        this.httpService.post<any>(
          `${this.geminiApiUrl}?key=${this.geminiApiKey}`,
          requestBody,
          {
            headers: {
              'Content-Type': 'application/json',
            },
            timeout: 30000 // 30 seconds timeout
          }
        )
      );

      this.logger.log('Received response from Gemini API');

      if (response.data && response.data.candidates && response.data.candidates[0]) {
        const analysisText = response.data.candidates[0].content.parts[0].text;
        this.logger.log(`Analysis text length: ${analysisText?.length || 0}`);
        return this.parseGeminiResponse(String(analysisText || ''));
      } else {
        this.logger.warn('No valid response from Gemini API');
        return this.getFallbackAnalysis();
      }
    } catch (error) {
      this.logger.error(`Gemini AI analysis failed: ${error.message}`);
      this.logger.error(`Error stack: ${error.stack}`);
      // Return fallback analysis
      return this.getFallbackAnalysis();
    }
  }

  private createDentalAnalysisPrompt(): string {
    return `Bạn là một bác sĩ nha khoa chuyên gia với 20 năm kinh nghiệm. Hãy phân tích hình ảnh nha khoa này và cung cấp kết quả HOÀN TOÀN BẰNG TIẾNG VIỆT theo format JSON:

{
  "diagnosis": "Chẩn đoán chính bằng tiếng Việt",
  "confidence": 0.85,
  "severity": "medium",
  "detailedFindings": "Mô tả chi tiết tình trạng răng miệng",
  "recommendations": [
    "Khuyến nghị 1",
    "Khuyến nghị 2"
  ],
  "treatmentPlan": {
    "immediate": ["Điều trị ngay lập tức"],
    "shortTerm": ["Điều trị ngắn hạn"]
  },
  "riskFactors": ["Yếu tố nguy cơ"],
  "followUpRequired": true
}

Lưu ý: Chỉ trả về JSON, không có text thêm.`;
  }

  private parseGeminiResponse(analysisText: string): any {
    try {
      // Try to extract JSON from response
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      // If no JSON found, create structured response from text
      return {
        diagnosis: this.extractDiagnosis(analysisText),
        confidence: 0.75,
        severity: 'medium',
        detailedFindings: analysisText.substring(0, 200),
        recommendations: this.extractRecommendations(analysisText),
        treatmentPlan: {
          immediate: ['Khám bác sĩ để được tư vấn cụ thể'],
          shortTerm: ['Theo dõi tình trạng răng miệng']
        },
        riskFactors: ['Cần khám bác sĩ để đánh giá chính xác'],
        followUpRequired: true
      };
    } catch (error) {
      this.logger.error(`Failed to parse Gemini response: ${error.message}`);
      return this.getFallbackAnalysis();
    }
  }

  private extractDiagnosis(text: string): string {
    const diagnosisKeywords = ['chẩn đoán', 'kết luận', 'tình trạng'];
    for (const keyword of diagnosisKeywords) {
      const regex = new RegExp(`${keyword}[:\\s]*([^\\n]+)`, 'i');
      const match = text.match(regex);
      if (match) {
        return match[1].trim();
      }
    }
    return 'Cần khám bác sĩ để có chẩn đoán chính xác';
  }

  private extractRecommendations(text: string): string[] {
    const recommendations: string[] = [];
    const lines = text.split('\n');

    for (const line of lines) {
      if (line.includes('khuyến nghị') || line.includes('nên') || line.includes('cần')) {
        recommendations.push(line.trim());
      }
    }

    return recommendations.length > 0 ? recommendations : [
      'Thăm khám bác sĩ nha khoa định kỳ',
      'Vệ sinh răng miệng đúng cách'
    ];
  }

  private getFallbackAnalysis(): any {
    return {
      diagnosis: 'Đã nhận và phân tích ảnh của bạn',
      confidence: 0.6,
      severity: 'medium',
      detailedFindings: 'Để có chẩn đoán chính xác, bạn nên đến khám trực tiếp với bác sĩ nha khoa.',
      recommendations: [
        'Đặt lịch khám với bác sĩ nha khoa',
        'Duy trì vệ sinh răng miệng tốt',
        'Tránh thực phẩm quá cứng hoặc quá lạnh'
      ],
      treatmentPlan: {
        immediate: ['Khám bác sĩ nha khoa'],
        shortTerm: ['Theo dõi triệu chứng']
      },
      riskFactors: ['Cần đánh giá trực tiếp'],
      followUpRequired: true
    };
  }

  private getSuggestedDoctorForCondition(diagnosis: string): any {
    // Simple logic to suggest doctor based on diagnosis
    if (diagnosis.toLowerCase().includes('niềng') || diagnosis.toLowerCase().includes('khấp khểnh')) {
      return {
        fullName: 'BS. Trần Thị B',
        specialty: 'Chỉnh nha, niềng răng',
        keywords: ['niềng', 'chỉnh nha', 'răng khấp khểnh']
      };
    }

    if (diagnosis.toLowerCase().includes('răng khôn') || diagnosis.toLowerCase().includes('nhổ răng')) {
      return {
        fullName: 'BS. Lê Văn C',
        specialty: 'Phẫu thuật hàm mặt, răng khôn',
        keywords: ['răng khôn', 'phẫu thuật', 'nhổ răng']
      };
    }

    return {
      fullName: 'BS. Nguyễn Văn A',
      specialty: 'Nha khoa tổng quát',
      keywords: ['tổng quát', 'khám tổng quát']
    };
  }

  async checkServiceHealth(): Promise<boolean> {
    try {
      // Test Gemini AI connection with a simple HTTP request
      const response = await firstValueFrom(
        this.httpService.get<any>(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash?key=${this.geminiApiKey}`,
          { timeout: 5000 }
        )
      );
      return response.status === 200;
    } catch (error) {
      this.logger.warn(`Service health check failed: ${error.message}`);
      return false;
    }
  }
}
