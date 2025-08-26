import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { AppModule } from './app.module';
import { IoAdapter } from '@nestjs/platform-socket.io';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Serve static files
  app.useStaticAssets(join(__dirname, '..', 'public'));

  // Enable CORS
  app.enableCors({
    origin: true,
    credentials: true,
  });

  // Register Socket.IO adapter with the Nest application instance
  // Passing the Nest app lets the adapter bind to the correct HTTP server instance
  app.useWebSocketAdapter(new IoAdapter(app));

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT') || 3020;

  await app.listen(port);
  console.log(`🦷 Dental Chatbot Service is running on: http://localhost:${port}`);
}

bootstrap();
