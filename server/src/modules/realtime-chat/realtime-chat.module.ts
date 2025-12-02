import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { RealtimeChatController } from './realtime-chat.controller';
import { RealtimeChatService } from './realtime-chat.service';
import { RealtimeChatGateway } from './realtime-chat.gateway';
import {
  Conversation,
  ConversationSchema,
} from './schemas/conversation.schema';
import { Message, MessageSchema } from './schemas/message.schema';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Conversation.name, schema: ConversationSchema },
      { name: Message.name, schema: MessageSchema },
    ]),
    MulterModule.register({
      storage: memoryStorage(), // Use multer's memory storage for Cloudinary upload
    }),
    CloudinaryModule,
  ],
  controllers: [RealtimeChatController],
  providers: [RealtimeChatService, RealtimeChatGateway],
  exports: [RealtimeChatService, RealtimeChatGateway],
})
export class RealtimeChatModule {}
