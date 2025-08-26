import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { ImageAnalysisController } from './image-analysis.controller';
import { ImageAnalysisService } from './image-analysis.service';

@Module({
  imports: [
    MulterModule.register({
      dest: './uploads/images',
    }),
  ],
  controllers: [ImageAnalysisController],
  providers: [ImageAnalysisService],
  exports: [ImageAnalysisService],
})
export class ImageAnalysisModule {}
