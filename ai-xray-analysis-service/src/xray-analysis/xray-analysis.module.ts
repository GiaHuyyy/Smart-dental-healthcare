import { Module } from '@nestjs/common';
import { XrayAnalysisController } from './xray-analysis.controller';
import { XrayAnalysisService } from './xray-analysis.service';

@Module({
  controllers: [XrayAnalysisController],
  providers: [XrayAnalysisService]
})
export class XrayAnalysisModule {}
