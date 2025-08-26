import { Test, TestingModule } from '@nestjs/testing';
import { ChatbotService } from './chatbot.service';

describe('ChatbotService', () => {
  let service: ChatbotService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ChatbotService],
    }).compile();

    service = module.get<ChatbotService>(ChatbotService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('creates a new session and responds to welcome', async () => {
    const sessionId = 'test-session-1';
    const userId = 'user-1';

    const response = await service.processMessage(sessionId, userId, 'xin chào');

    expect(response).toBeDefined();
    expect(typeof response.message).toBe('string');

  const session = service.getSession(sessionId);
  expect(session).toBeDefined();
  // use non-null assertion because we just checked it's defined
  expect(session!.userId).toBe(userId);
  expect(session!.messages.length).toBeGreaterThanOrEqual(2); // user + bot
  });
});
