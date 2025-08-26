import {
  Injectable,
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  Get,
  Logger,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AnalyzeService, AnalysisResult } from './analyze.service';

@Controller('analyze')
export class AnalyzeController {
  private readonly logger = new Logger(AnalyzeController.name);

  constructor(private readonly analyzeService: AnalyzeService) {}

  @Post()
  @UseInterceptors(FileInterceptor('xray'))
  async analyzeXray(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<AnalysisResult> {
    if (!file) {
      throw new BadRequestException('No X-ray image file provided');
    }

    this.logger.log(`Received X-ray file: ${file.originalname} (${file.size} bytes)`);

    try {
      const result = await this.analyzeService.analyzeXray(
        file.path,
        file.filename,
      );

      this.logger.log(`Analysis completed for ${file.filename}`);
      return result;
    } catch (error) {
      this.logger.error(`Analysis failed: ${error.message}`);
      throw new BadRequestException('Failed to analyze X-ray image');
    }
  }

  @Get('health')
  async healthCheck() {
    return await this.analyzeService.healthCheck();
  }
}