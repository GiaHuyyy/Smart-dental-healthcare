import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AiChatHistoryController } from './ai-chat-history.controller';
import { AiChatHistoryService } from './ai-chat-history.service';
import {
  AiChatSession,
  AiChatSessionSchema,
} from './schemas/ai-chat-session.schema';
import {
  AiChatMessage,
  AiChatMessageSchema,
} from './schemas/ai-chat-message.schema';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AiChatSession.name, schema: AiChatSessionSchema },
      { name: AiChatMessage.name, schema: AiChatMessageSchema },
    ]),
    CloudinaryModule,
  ],
  controllers: [AiChatHistoryController],
  providers: [AiChatHistoryService],
  exports: [AiChatHistoryService],
})
export class AiChatHistoryModule {}
