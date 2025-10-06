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
  const rawCorsOrigin = configService.get<string>('CORS_ORIGIN');
  const fallbackOrigins = ['http://localhost:3000', 'http://localhost:8082'];
  const configuredOrigins = rawCorsOrigin
    ? rawCorsOrigin.split(',').map((origin) => origin.trim()).filter(Boolean)
    : [];

  const allowedOrigins = configuredOrigins.length > 0 ? configuredOrigins : fallbackOrigins;

  const isOriginAllowed = (candidate: string): boolean => {
    const sanitizedCandidate = candidate.replace(/\/+$/, '');

    return allowedOrigins.some((allowedOrigin) => {
      const sanitizedAllowed = allowedOrigin.replace(/\/+$/, '');

      if (sanitizedAllowed === '*') {
        return true;
      }

      if (sanitizedAllowed.endsWith('*')) {
        const prefix = sanitizedAllowed.slice(0, -1);
        return sanitizedCandidate.startsWith(prefix);
      }

      return sanitizedCandidate === sanitizedAllowed;
    });
  };

  app.enableCors({
    origin: (requestOrigin, callback) => {
      if (!requestOrigin) {
        return callback(null, true);
      }

      if (isOriginAllowed(requestOrigin)) {
        return callback(null, true);
      }

      return callback(new Error(`Origin ${requestOrigin} is not allowed by CORS configuration.`));
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    preflightContinue: false,
    credentials: true,
    optionsSuccessStatus: 204,
  });

  await app.listen(port);
}
bootstrap();
