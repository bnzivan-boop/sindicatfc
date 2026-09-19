import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';
import { ZodValidationPipe } from './common/pipes/zod-validation.pipe.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.setGlobalPrefix('v1');
  // web-кабинет и Expo web в dev; в prod — список доменов из конфигурации
  app.enableCors({ origin: true, credentials: true, allowedHeaders: ['content-type', 'authorization', 'idempotency-key'] });
  app.useGlobalPipes(new ZodValidationPipe());
  app.enableShutdownHooks();

  const swagger = new DocumentBuilder()
    .setTitle('Синдикат API')
    .setDescription('Рыболовная турнирная лига — контракт /v1 (см. docs/sindikat-technical-handoff.md, раздел 8)')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, swagger));

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  Logger.log(`API: http://localhost:${port}/v1 · OpenAPI: http://localhost:${port}/docs`, 'Bootstrap');
}
await bootstrap();
