import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RealtimeChatController } from './realtime-chat.controller';
import { RealtimeChatService } from './realtime-chat.service';
import { RealtimeChatGateway } from './realtime-chat.gateway';
import {
  Conversation,
  ConversationSchema,
} from './schemas/conversation.schema';
import { Message, MessageSchema } from './schemas/message.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Conversation.name, schema: ConversationSchema },
      { name: Message.name, schema: MessageSchema },
    ]),
  ],
  controllers: [RealtimeChatController],
  providers: [RealtimeChatService, RealtimeChatGateway],
  exports: [RealtimeChatService],
})
export class RealtimeChatModule {}
