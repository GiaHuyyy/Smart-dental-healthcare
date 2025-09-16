import { Module } from '@nestjs/common';
import { WebRTCGateway } from './webrtc.gateway';
import { RealtimeChatModule } from '../realtime-chat/realtime-chat.module';

@Module({
  imports: [RealtimeChatModule],
  providers: [WebRTCGateway],
  exports: [WebRTCGateway],
})
export class WebRTCModule {}
