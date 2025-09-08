import { GoogleGenerativeAI } from '@google/generative-ai';
import { HttpService } from '@nestjs/axios';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import { firstValueFrom } from 'rxjs';
import { UsersService } from '../users/users.service';

export interface ImageAnalysisResult {
  message: string;
  analysisResult: {
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
    metadata: {
      analysisDate: string;
      processingTime: number;
      imageQuality: 'poor' | 'fair' | 'good' | 'excellent';
      aiModelVersion: string;
      analysisSource: string;
    };
  };
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
  // Thêm các trường cho Cloudinary
  cloudinaryUrl?: string;
  cloudinaryPublicId?: string;
}

@Injectable()
export class ImageAnalysisService {
  private readonly logger = new Logger(ImageAnalysisService.name);
  private readonly geminiApiKey: string;
  // keep URL for health check but use SDK for requests
  private readonly geminiApiUrl =
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
    private readonly usersService: UsersService,
  ) {
    this.geminiApiKey =
      this.configService.get<string>('GEMINI_API_KEY') || 'your-gemini-api-key';
  this.logger.log(`Initializing ImageAnalysisService with Gemini API`);
  // Initialize SDK client and model
    try {
      this.genAI = new GoogleGenerativeAI(this.geminiApiKey);
      this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    } catch (initError) {
      this.logger.warn(`Failed to initialize Gemini SDK: ${initError?.message || initError}`);
      // Keep service running; health checks will report issues.
      this.genAI = null as any;
      this.model = null as any;
    }
  }

  async analyzeImage(
    filePath: string,
    userId: string,
  ): Promise<ImageAnalysisResult> {
    const startTime = Date.now();

    try {
      this.logger.log(
        `Starting image analysis for user ${userId}, file: ${filePath}`,
      );

      // Check if filePath is a URL or local path
      const isUrl = filePath.startsWith('http://') || filePath.startsWith('https://');
      
      if (!isUrl && !fs.existsSync(filePath)) {
        throw new BadRequestException('File không tồn tại');
      }

      // Analyze image using Gemini AI
      const analysisResult = await this.analyzeWithGemini(filePath);

      // Add metadata like the original service
      const processingTime = Date.now() - startTime;
      const analysisWithMetadata = {
        ...analysisResult,
        metadata: {
          analysisDate: new Date().toISOString(),
          processingTime,
          imageQuality: 'good' as const,
          aiModelVersion: 'gemini-2.0-flash',
          analysisSource: 'gemini_ai',
        },
      };

      return {
        message: 'Phân tích ảnh hoàn tất',
        analysisResult: analysisWithMetadata,
        richContent: {
          title: 'Kết quả phân tích ảnh nha khoa',
          analysis: analysisResult.diagnosis,
          highlights: [analysisResult.diagnosis || 'Kết quả sơ bộ'],
          recommendations: analysisResult.recommendations,
          sections: [
            {
              heading: 'Chẩn đoán',
              text: analysisResult.diagnosis,
            },
            {
              heading: 'Độ tin cậy',
              text: `${(analysisResult.confidence * 100).toFixed(1)}%`,
            },
            {
              heading: 'Mức độ',
              text: analysisResult.severity || '-',
            },
            {
              heading: 'Ước tính chi phí',
              text: analysisResult.estimatedCost
                ? `${analysisResult.estimatedCost.min.toLocaleString('vi-VN')} - ${analysisResult.estimatedCost.max.toLocaleString('vi-VN')} VND`
                : '-',
            },
            {
              heading: 'Tình trạng răng miệng',
              text: analysisResult.detailedFindings,
              bullets: analysisResult.riskFactors,
            },
            {
              heading: 'Kế hoạch điều trị',
              text: 'Các bước điều trị được đề xuất',
              bullets: [
                ...analysisResult.treatmentPlan.immediate,
                ...analysisResult.treatmentPlan.shortTerm,
              ],
            },
          ],
        },
        options: [
          'Giải thích thêm về chẩn đoán',
          'Đặt lịch khám với bác sĩ',
          'Hướng dẫn chăm sóc tại nhà',
          'Xem các trường hợp tương tự',
        ],
        suggestedDoctor: await this.getSuggestedDoctorForCondition(
          String(analysisResult.diagnosis || ''),
        ),
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
      this.logger.log(`Starting Gemini AI analysis for file: ${filePath}`);

      let base64Image: string;
      
      // Check if filePath is a URL or local path
      const isUrl = filePath.startsWith('http://') || filePath.startsWith('https://');
      
      if (isUrl) {
        // Download image from URL and convert to base64
        try {
          const response = await firstValueFrom(
            this.httpService.get(filePath, {
              responseType: 'arraybuffer',
              timeout: 30000,
            })
          );
          
          if (!response.data || response.data.length === 0) {
            throw new Error('Empty response from image URL');
          }
          
          const buffer = Buffer.from(response.data);
          base64Image = buffer.toString('base64');
          
          // Log the content type for debugging
          const contentType = response.headers['content-type'];
          this.logger.log(`Downloaded image content-type: ${contentType}, size: ${buffer.length} bytes`);
        } catch (downloadError) {
          this.logger.error(`Failed to download image from URL: ${downloadError.message}`);
          throw new Error(`Không thể tải ảnh từ URL: ${downloadError.message}`);
        }
      } else {
        // Read local file and convert to base64
        const fileBuffer = fs.readFileSync(filePath);
        base64Image = fileBuffer.toString('base64');
      }

      // Create prompt for Gemini
      const prompt = this.createDentalAnalysisPrompt();

      // Determine MIME type based on URL or default to jpeg
      let mimeType = 'image/jpeg';
      if (isUrl) {
        const urlLower = filePath.toLowerCase();
        if (urlLower.includes('.png')) {
          mimeType = 'image/png';
        } else if (urlLower.includes('.gif')) {
          mimeType = 'image/gif';
        } else if (urlLower.includes('.webp')) {
          mimeType = 'image/webp';
        }
      }

      // Call Gemini via SDK to ensure correct request schema for inline data
      try {
        if (!this.model) {
          throw new Error('Gemini SDK not initialized (missing GEMINI_API_KEY)');
        }

        const result = await this.model.generateContent([
          prompt,
          {
            inlineData: {
              data: base64Image,
              mimeType,
            },
          },
        ]);

        // SDK returns a response helper
        const response = await result.response;
        const analysisText = String(response.text() || '');

        const parsedResult = this.parseGeminiResponse(analysisText);
        this.logger.log('Gemini AI analysis completed successfully');
        return parsedResult;
      } catch (sdkError) {
        // Detect API key related errors and annotate them for controller handling
        const msg = String(sdkError?.message || sdkError);
        this.logger.error(`Gemini SDK call failed: ${msg}`);

        if (msg.includes('API key expired') || msg.includes('API_KEY_INVALID') || msg.toLowerCase().includes('api key')) {
          // Throw a clear error that the controller can map to user-friendly text
          throw new Error(`GEMINI_API_KEY_INVALID_OR_EXPIRED: ${msg}`);
        }

        // rethrow original error for other handlers
        throw sdkError;
      }
    } catch (error) {
      this.logger.error(`Gemini AI analysis failed: ${error.message}`);
      // Return fallback analysis
      return this.getFallbackAnalysis();
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

  private parseGeminiResponse(analysisText: string): any {
    try {
      // Find JSON in response text
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in Gemini response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      // Validate and normalize result according to old service format
      return {
        diagnosis: parsed.diagnosis || 'Không thể chẩn đoán',
        confidence: Math.min(Math.max(Number(parsed.confidence) || 0.5, 0), 1),
        detailedFindings:
          parsed.detailedFindings || 'Không có phát hiện chi tiết',
        recommendations: Array.isArray(parsed.recommendations)
          ? parsed.recommendations
          : ['Khám bác sĩ nha khoa'],
        severity: ['low', 'medium', 'high', 'critical'].includes(
          String(parsed.severity),
        )
          ? parsed.severity
          : 'medium',
        treatmentPlan: {
          immediate: Array.isArray(parsed.treatmentPlan?.immediate)
            ? parsed.treatmentPlan.immediate
            : [],
          shortTerm: Array.isArray(parsed.treatmentPlan?.shortTerm)
            ? parsed.treatmentPlan.shortTerm
            : [],
          longTerm: Array.isArray(parsed.treatmentPlan?.longTerm)
            ? parsed.treatmentPlan.longTerm
            : [],
        },
        riskFactors: Array.isArray(parsed.riskFactors)
          ? parsed.riskFactors
          : [],
        followUpRequired: Boolean(parsed.followUpRequired),
        estimatedCost: {
          min: Number(parsed.estimatedCost?.min) || 100000,
          max: Number(parsed.estimatedCost?.max) || 1000000,
          currency: parsed.estimatedCost?.currency || 'VND',
        },
      };
    } catch (error) {
      this.logger.error(`Failed to parse Gemini response: ${error.message}`);
      // Return fallback result according to old format
      return this.getFallbackAnalysis();
    }
  }

  private getFallbackAnalysis(): any {
    return {
      diagnosis: 'Cần khám bác sĩ nha khoa để chẩn đoán chính xác',
      confidence: 0.3,
      detailedFindings: 'Không thể phân tích tự động, cần khám trực tiếp',
      recommendations: ['Khám bác sĩ nha khoa', 'Chụp X-quang chi tiết'],
      severity: 'medium',
      treatmentPlan: {
        immediate: ['Khám bác sĩ'],
        shortTerm: ['Điều trị theo chỉ định'],
        longTerm: ['Theo dõi định kỳ'],
      },
      riskFactors: ['Cần khám chuyên khoa'],
      followUpRequired: true,
      estimatedCost: {
        min: 200000,
        max: 500000,
        currency: 'VND',
      },
    };
  }

  private async getSuggestedDoctorForCondition(
    diagnosis: string,
  ): Promise<any> {
    try {
      // Get all doctors from database
      const doctorsResponse = await this.usersService.findAllDoctors(null);
      const doctors = doctorsResponse.data || [];

      if (doctors.length === 0) {
        // Fallback to default if no doctors in database
        return {
          fullName: 'BS. Nguyễn Thị Lan',
          specialty: 'Nha khoa tổng quát',
          keywords: ['khám tổng quát', 'tư vấn nha khoa', 'điều trị đa khoa'],
        };
      }

      // Intelligent doctor matching based on diagnosis keywords
      const diagnosisLower = diagnosis.toLowerCase();

      // Orthodontics - Niềng răng
      if (
        diagnosisLower.includes('niềng') ||
        diagnosisLower.includes('khấp khểnh') ||
        diagnosisLower.includes('chỉnh nha') ||
        diagnosisLower.includes('răng hô') ||
        diagnosisLower.includes('răng móm') ||
        diagnosisLower.includes('cắn') ||
        diagnosisLower.includes('khớp cắn')
      ) {
        const selectedDoctor = doctors.find(
          (doc: any) =>
            doc.specialty?.toLowerCase().includes('chỉnh nha') ||
            doc.specialty?.toLowerCase().includes('niềng') ||
            doc.fullName?.toLowerCase().includes('chỉnh nha'),
        );
        if (selectedDoctor) {
          return {
            fullName: selectedDoctor.fullName || 'BS. Chỉnh nha',
            specialty: selectedDoctor.specialty || 'Chỉnh nha - Niềng răng',
            keywords: [
              'niềng răng',
              'chỉnh nha',
              'răng khấp khểnh',
              'khớp cắn',
              'răng hô móm',
            ],
          };
        }
      }

      // Oral Surgery - Phẫu thuật
      if (
        diagnosisLower.includes('răng khôn') ||
        diagnosisLower.includes('nhổ răng') ||
        diagnosisLower.includes('phẫu thuật') ||
        diagnosisLower.includes('mọc lệch') ||
        diagnosisLower.includes('viêm xung quanh') ||
        diagnosisLower.includes('áp xe')
      ) {
        const selectedDoctor = doctors.find(
          (doc: any) =>
            doc.specialty?.toLowerCase().includes('phẫu thuật') ||
            doc.specialty?.toLowerCase().includes('răng khôn') ||
            doc.fullName?.toLowerCase().includes('phẫu thuật'),
        );
        if (selectedDoctor) {
          return {
            fullName: selectedDoctor.fullName || 'BS. Phẫu thuật',
            specialty: selectedDoctor.specialty || 'Phẫu thuật hàm mặt',
            keywords: [
              'răng khôn',
              'phẫu thuật',
              'nhổ răng',
              'áp xe',
              'viêm nhiễm',
            ],
          };
        }
      }

      // Endodontics - Điều trị tủy
      if (
        diagnosisLower.includes('sâu răng') ||
        diagnosisLower.includes('trám răng') ||
        diagnosisLower.includes('tủy răng') ||
        diagnosisLower.includes('điều trị tủy') ||
        diagnosisLower.includes('đau răng') ||
        diagnosisLower.includes('khoang miệng')
      ) {
        const selectedDoctor = doctors.find(
          (doc: any) =>
            doc.specialty?.toLowerCase().includes('tủy') ||
            doc.specialty?.toLowerCase().includes('nội nha') ||
            doc.fullName?.toLowerCase().includes('tủy'),
        );
        if (selectedDoctor) {
          return {
            fullName: selectedDoctor.fullName || 'BS. Nội nha',
            specialty: selectedDoctor.specialty || 'Điều trị tủy - Nội nha',
            keywords: [
              'sâu răng',
              'điều trị tủy',
              'trám răng',
              'đau răng',
              'nhiễm trùng tủy',
            ],
          };
        }
      }

      // Periodontics - Nha chu
      if (
        diagnosisLower.includes('nướu') ||
        diagnosisLower.includes('viêm lợi') ||
        diagnosisLower.includes('chảy máu') ||
        diagnosisLower.includes('nha chu') ||
        diagnosisLower.includes('cao răng') ||
        diagnosisLower.includes('túi nha chu')
      ) {
        const selectedDoctor = doctors.find(
          (doc: any) =>
            doc.specialty?.toLowerCase().includes('nha chu') ||
            doc.specialty?.toLowerCase().includes('nướu') ||
            doc.fullName?.toLowerCase().includes('nha chu'),
        );
        if (selectedDoctor) {
          return {
            fullName: selectedDoctor.fullName || 'BS. Nha chu',
            specialty: selectedDoctor.specialty || 'Nha chu - Điều trị nướu',
            keywords: [
              'viêm nướu',
              'nha chu',
              'chảy máu nướu',
              'cao răng',
              'túi nha chu',
            ],
          };
        }
      }

      // Prosthodontics - Răng sứ thẩm mỹ
      if (
        diagnosisLower.includes('răng sứ') ||
        diagnosisLower.includes('bọc răng') ||
        diagnosisLower.includes('veneer') ||
        diagnosisLower.includes('cầu răng') ||
        diagnosisLower.includes('thẩm mỹ') ||
        diagnosisLower.includes('làm đẹp')
      ) {
        const selectedDoctor = doctors.find(
          (doc: any) =>
            doc.specialty?.toLowerCase().includes('răng sứ') ||
            doc.specialty?.toLowerCase().includes('thẩm mỹ') ||
            doc.fullName?.toLowerCase().includes('thẩm mỹ'),
        );
        if (selectedDoctor) {
          return {
            fullName: selectedDoctor.fullName || 'BS. Thẩm mỹ',
            specialty: selectedDoctor.specialty || 'Răng sứ thẩm mỹ',
            keywords: [
              'răng sứ',
              'veneer',
              'thẩm mỹ răng',
              'bọc răng',
              'cười đẹp',
            ],
          };
        }
      }

      // Implantology - Cấy ghép
      if (
        diagnosisLower.includes('implant') ||
        diagnosisLower.includes('cấy ghép') ||
        diagnosisLower.includes('mất răng') ||
        diagnosisLower.includes('trồng răng') ||
        diagnosisLower.includes('răng giả')
      ) {
        const selectedDoctor = doctors.find(
          (doc: any) =>
            doc.specialty?.toLowerCase().includes('implant') ||
            doc.specialty?.toLowerCase().includes('cấy ghép') ||
            doc.fullName?.toLowerCase().includes('implant'),
        );
        if (selectedDoctor) {
          return {
            fullName: selectedDoctor.fullName || 'BS. Implant',
            specialty: selectedDoctor.specialty || 'Cấy ghép Implant',
            keywords: [
              'implant',
              'cấy ghép răng',
              'trồng răng',
              'mất răng',
              'răng giả cố định',
            ],
          };
        }
      }

      // Default: Return first available doctor or general dentist
      const generalDoctor =
        doctors.find(
          (doc: any) =>
            doc.specialty?.toLowerCase().includes('tổng quát') ||
            doc.specialty?.toLowerCase().includes('general') ||
            !doc.specialty,
        ) || doctors[0];

      return {
        fullName: generalDoctor?.fullName || 'BS. Nha khoa',
        specialty: generalDoctor?.specialty || 'Nha khoa tổng quát',
        keywords: ['khám tổng quát', 'tư vấn nha khoa', 'điều trị đa khoa'],
      };
    } catch (error) {
      this.logger.error(`Error getting doctor suggestion: ${error.message}`);
      // Fallback to default doctor
      return {
        fullName: 'BS. Nguyễn Thị Lan',
        specialty: 'Nha khoa tổng quát',
        keywords: ['khám tổng quát', 'tư vấn nha khoa', 'điều trị đa khoa'],
      };
    }
  }

  async checkServiceHealth(): Promise<boolean> {
    try {
      // Test Gemini AI connection
      const response: any = await (firstValueFrom as any)(
        this.httpService.get(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash?key=${this.geminiApiKey}`,
          { timeout: 5000 },
        ),
      );
      return !!response.data;
    } catch (error) {
      this.logger.warn(`Service health check failed: ${error.message}`);
      return false;
    }
  }
}
