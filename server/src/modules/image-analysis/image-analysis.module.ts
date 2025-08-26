import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { HttpModule } from '@nestjs/axios';
import { ImageAnalysisController } from './image-analysis.controller';
import { ImageAnalysisService } from './image-analysis.service';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    MulterModule.register({
      dest: './uploads/images',
    }),
    HttpModule,
    UsersModule,
  ],
  controllers: [ImageAnalysisController],
  providers: [ImageAnalysisService],
  exports: [ImageAnalysisService],
})
export class ImageAnalysisModule {}
