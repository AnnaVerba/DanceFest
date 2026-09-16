import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { DEFAULT_FRONTEND_URL } from './team/team.constants';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  // Behind a reverse proxy in prod, so req.ip reads X-Forwarded-For.
  app.set('trust proxy', true);
  app.enableCors({ origin: process.env.FRONTEND_URL ?? DEFAULT_FRONTEND_URL });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('DanseFest API')
    .setDescription('REST API для DanseFest')
    .setVersion('1.0')
    .addBearerAuth()
    // Closed by default (GlobalJwtAuthGuard); @Public() routes work without
    // the token even though the UI shows a padlock on them.
    .addSecurityRequirements('bearer')
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

  await app.listen(process.env.PORT ?? 4000);
}
void bootstrap();
