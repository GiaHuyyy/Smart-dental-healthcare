import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT') || 8081;

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
    }),
  );
  app.setGlobalPrefix('api/v1', { exclude: [''] });

  //config cors
  app.enableCors({
    origin: configService.get<string>('CORS_ORIGIN'),
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    preflightContinue: false,
    credentials: true,
  });

  await app.listen(port);
}
bootstrap();
