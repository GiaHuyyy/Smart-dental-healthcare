import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  
  // Enable CORS
  app.enableCors();
  
  // Serve static files from public directory
  app.useStaticAssets(join(__dirname, '..', 'public'));
  
  // Serve uploaded files
  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads/',
  });
  
  await app.listen(process.env.PORT ?? 3010);
  console.log(`Application is running on: http://localhost:${process.env.PORT ?? 3010}`);
}
bootstrap();
