import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AIFeedbackController } from './ai-feedback.controller';
import { AIFeedbackService } from './ai-feedback.service';
import { AIFeedback, AIFeedbackSchema } from './schemas/ai-feedback.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AIFeedback.name, schema: AIFeedbackSchema },
    ]),
  ],
  controllers: [AIFeedbackController],
  providers: [AIFeedbackService],
  exports: [AIFeedbackService],
})
export class AIFeedbackModule {}
