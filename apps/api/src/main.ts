import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    rawBody: true, // Required for LINE webhook signature validation
  });

  app.use(helmet());
  app.use(cookieParser());
  const webUrl = process.env.WEB_URL || 'http://localhost:3000';
  app.enableCors({
    origin: [webUrl, 'http://localhost:3600', 'http://localhost:3000'],
    credentials: true,
  });
  app.useGlobalFilters(new GlobalExceptionFilter());

  const port = process.env.API_PORT || 3001;
  await app.listen(port);
  console.log(`API server running on http://localhost:${port}`);
}

bootstrap();
