import { Test, TestingModule } from '@nestjs/testing';
import { XrayAnalysisController } from './xray-analysis.controller';

describe('XrayAnalysisController', () => {
  let controller: XrayAnalysisController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [XrayAnalysisController],
    }).compile();

    controller = module.get<XrayAnalysisController>(XrayAnalysisController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
