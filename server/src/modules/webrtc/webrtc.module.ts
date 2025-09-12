import { Module } from '@nestjs/common';
import { WebRTCGateway } from './webrtc.gateway';

@Module({
  providers: [WebRTCGateway],
  exports: [WebRTCGateway],
})
export class WebRTCModule {}
