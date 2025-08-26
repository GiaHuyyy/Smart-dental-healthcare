import { Test, TestingModule } from '@nestjs/testing';
import { XrayAnalysisService } from './xray-analysis.service';

describe('XrayAnalysisService', () => {
  let service: XrayAnalysisService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [XrayAnalysisService],
    }).compile();

    service = module.get<XrayAnalysisService>(XrayAnalysisService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
