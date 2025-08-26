import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  Get,
  Logger,
  UseGuards,
  Request,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../../auth/passport/jwt-auth.guard';
import { Public } from '../../decorator/customize';
import {
  ImageAnalysisService,
  ImageAnalysisResult,
} from './image-analysis.service';
import { diskStorage } from 'multer';
import { extname } from 'path';

@Controller('image-analysis')
@UseGuards(JwtAuthGuard)
export class ImageAnalysisController {
  private readonly logger = new Logger(ImageAnalysisController.name);

  constructor(private readonly imageAnalysisService: ImageAnalysisService) {}

  @Public()
  @Post('upload')
  @UseInterceptors(
    FileInterceptor('image', {
      storage: diskStorage({
        destination: './uploads/images',
        filename: (req, file, callback) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname((file.originalname || '') as string);
          const filename = `dental_image_${uniqueSuffix}${ext}`;
          callback(null, filename);
        },
      }),
      fileFilter: (req, file, callback) => {
        if (!file.originalname?.match(/\.(jpg|jpeg|png|gif)$/)) {
          return callback(
            new BadRequestException(
              'Chỉ chấp nhận file ảnh (jpg, jpeg, png, gif)!',
            ),
            false,
          );
        }
        callback(null, true);
      },
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
      },
    }),
  )
  async uploadAndAnalyze(
    @UploadedFile() file: any,
    @Request() req: any,
  ): Promise<{
    success: boolean;
    data?: ImageAnalysisResult;
    error?: string;
  }> {
    try {
      this.logger.log(
        `Upload request received. File: ${file ? 'exists' : 'null'}`,
      );
      this.logger.log(`Request body:`, req.body);

      if (!file) {
        this.logger.error('No file uploaded');
        throw new BadRequestException('Không có file được upload');
      }

      // For demo purposes, use a default user ID when no authentication
      const userId = req.user?.id || 'demo_user_' + Date.now();

      this.logger.log(
        `Processing image upload for user ${userId}: ${file.originalname} (${file.size} bytes)`,
      );

      const analysisResult = await this.imageAnalysisService.analyzeImage(
        file.path as string,
        userId as string,
      );

      return {
        success: true,
        data: analysisResult,
      };
    } catch (error) {
      this.logger.error(`Image analysis failed: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  @Public()
  @Get('health')
  async healthCheck(): Promise<{
    success: boolean;
    data?: any;
    error?: string;
  }> {
    try {
      const chatbotServiceHealthy =
        await this.imageAnalysisService.checkChatbotServiceHealth();

      return {
        success: true,
        data: {
          status: 'healthy',
          chatbotService: chatbotServiceHealthy ? 'connected' : 'disconnected',
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      this.logger.error(`Health check failed: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}
