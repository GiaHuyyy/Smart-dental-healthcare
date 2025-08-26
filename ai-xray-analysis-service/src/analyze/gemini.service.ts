import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import { firstValueFrom } from 'rxjs';

export interface GeminiAnalysisResult {
  diagnosis: string;
  confidence: number;
  detailedFindings: string;
  recommendations: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  treatmentPlan: {
    immediate: string[];
    shortTerm: string[];
    longTerm: string[];
  };
  riskFactors: string[];
  followUpRequired: boolean;
  estimatedCost: {
    min: number;
    max: number;
    currency: string;
  };
}

@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);
  private readonly geminiApiKey: string;
  private readonly geminiApiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.geminiApiKey = this.configService.get<string>('GEMINI_API_KEY') || 'AIzaSyDDcQCeNgxl98wPbG6-1650PFLXs1B1Yd0';
  }

  async analyzeXrayWithGemini(filePath: string, filename: string): Promise<GeminiAnalysisResult> {
    try {
      this.logger.log(`Starting Gemini AI analysis for file: ${filename}`);
      
      // Đọc file và convert sang base64
      const fileBuffer = fs.readFileSync(filePath);
      const base64Image = fileBuffer.toString('base64');
      
      // Tạo prompt cho Gemini
      const prompt = this.createDentalAnalysisPrompt();
      
      // Gọi Gemini API
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.geminiApiUrl}?key=${this.geminiApiKey}`,
          {
            contents: [
              {
                parts: [
                  {
                    text: prompt
                  },
                  {
                    inline_data: {
                      mime_type: 'image/jpeg',
                      data: base64Image
                    }
                  }
                ]
              }
            ]
          },
          {
            headers: {
              'Content-Type': 'application/json'
            },
            timeout: 60000, // 60 seconds timeout
          }
        )
      );

      // Parse response từ Gemini
      const geminiResponse = response.data;
      const analysisText = geminiResponse.candidates[0].content.parts[0].text;
      
      // Parse và chuẩn hóa kết quả
      const parsedResult = this.parseGeminiResponse(analysisText);
      
      this.logger.log('Gemini AI analysis completed successfully');
      return parsedResult;
      
    } catch (error) {
      this.logger.error(`Gemini AI analysis failed: ${error.message}`);
      throw new Error(`Gemini AI analysis failed: ${error.message}`);
    }
  }

  private createDentalAnalysisPrompt(): string {
    return `Bạn là một bác sĩ nha khoa chuyên gia với 20 năm kinh nghiệm. Hãy phân tích hình ảnh X-quang nha khoa này và cung cấp kết quả HOÀN TOÀN BẰNG TIẾNG VIỆT:

1. CHẨN ĐOÁN CHÍNH: Mô tả ngắn gọn vấn đề chính bằng tiếng Việt
2. MỨC ĐỘ NGHIÊM TRỌNG: low/medium/high/critical
3. PHÁT HIỆN CHI TIẾT: 
   - Tình trạng răng (bằng tiếng Việt)
   - Cấu trúc xương (bằng tiếng Việt)
   - Sức khỏe nướu (bằng tiếng Việt)
   - Ống tủy (bằng tiếng Việt)
   - Sâu răng (bằng tiếng Việt)
   - Tình trạng nha chu (bằng tiếng Việt)
4. ĐỀ XUẤT ĐIỀU TRỊ: 3-5 gợi ý cụ thể bằng tiếng Việt
5. KẾ HOẠCH ĐIỀU TRỊ:
   - Ngay lập tức (1-2 tuần) - bằng tiếng Việt
   - Ngắn hạn (1-3 tháng) - bằng tiếng Việt
   - Dài hạn (3-12 tháng) - bằng tiếng Việt
6. YẾU TỐ NGUY CƠ: 2-3 yếu tố bằng tiếng Việt
7. THEO DÕI: Có/Không
8. CHI PHÍ ƯỚC TÍNH: Min-Max (VND)

QUAN TRỌNG: Tất cả nội dung phải bằng tiếng Việt, không được dùng tiếng Anh.

Hãy trả về kết quả theo format JSON sau:
{
  "diagnosis": "Chẩn đoán chính bằng tiếng Việt",
  "confidence": 0.85,
  "detailedFindings": "Phát hiện chi tiết bằng tiếng Việt",
  "recommendations": ["Đề xuất 1 bằng tiếng Việt", "Đề xuất 2 bằng tiếng Việt"],
  "severity": "medium",
  "treatmentPlan": {
    "immediate": ["Điều trị ngay bằng tiếng Việt"],
    "shortTerm": ["Điều trị ngắn hạn bằng tiếng Việt"],
    "longTerm": ["Điều trị dài hạn bằng tiếng Việt"]
  },
  "riskFactors": ["Yếu tố 1 bằng tiếng Việt", "Yếu tố 2 bằng tiếng Việt"],
  "followUpRequired": true,
  "estimatedCost": {
    "min": 500000,
    "max": 2000000,
    "currency": "VND"
  }
}`;
  }

  private parseGeminiResponse(responseText: string): GeminiAnalysisResult {
    try {
      // Tìm JSON trong response text
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in Gemini response');
      }
      
      const parsed = JSON.parse(jsonMatch[0]);
      
      // Validate và chuẩn hóa kết quả
      return {
        diagnosis: parsed.diagnosis || 'Không thể chẩn đoán',
        confidence: Math.min(Math.max(parsed.confidence || 0.5, 0), 1),
        detailedFindings: parsed.detailedFindings || 'Không có phát hiện chi tiết',
        recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : ['Khám bác sĩ nha khoa'],
        severity: ['low', 'medium', 'high', 'critical'].includes(parsed.severity) ? parsed.severity : 'medium',
        treatmentPlan: {
          immediate: Array.isArray(parsed.treatmentPlan?.immediate) ? parsed.treatmentPlan.immediate : [],
          shortTerm: Array.isArray(parsed.treatmentPlan?.shortTerm) ? parsed.treatmentPlan.shortTerm : [],
          longTerm: Array.isArray(parsed.treatmentPlan?.longTerm) ? parsed.treatmentPlan.longTerm : []
        },
        riskFactors: Array.isArray(parsed.riskFactors) ? parsed.riskFactors : [],
        followUpRequired: Boolean(parsed.followUpRequired),
        estimatedCost: {
          min: Number(parsed.estimatedCost?.min) || 100000,
          max: Number(parsed.estimatedCost?.max) || 1000000,
          currency: parsed.estimatedCost?.currency || 'VND'
        }
      };
    } catch (error) {
      this.logger.error(`Failed to parse Gemini response: ${error.message}`);
      // Return fallback result
      return {
        diagnosis: 'Cần khám bác sĩ nha khoa để chẩn đoán chính xác',
        confidence: 0.3,
        detailedFindings: 'Không thể phân tích tự động, cần khám trực tiếp',
        recommendations: ['Khám bác sĩ nha khoa', 'Chụp X-quang chi tiết'],
        severity: 'medium',
        treatmentPlan: {
          immediate: ['Khám bác sĩ'],
          shortTerm: ['Điều trị theo chỉ định'],
          longTerm: ['Theo dõi định kỳ']
        },
        riskFactors: ['Cần khám chuyên khoa'],
        followUpRequired: true,
        estimatedCost: {
          min: 200000,
          max: 500000,
          currency: 'VND'
        }
      };
    }
  }
}
