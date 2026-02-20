import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';
import helmet from 'helmet';
import compression from 'compression';
import * as express from 'express';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { AuditLogInterceptor } from './common/interceptors/audit-log.interceptor';
import { SanitizePipe } from './common/pipes/sanitize.pipe';
import { initSentry } from './common/sentry';

async function bootstrap() {
  // Sentry初期化（アプリ起動前に実行）
  initSentry();

  const isProduction = process.env.NODE_ENV === 'production';

  // WP-5: 本番環境でのJWT_SECRET検証
  if (isProduction) {
    const jwtSecret = process.env.JWT_SECRET;
    if (
      !jwtSecret ||
      jwtSecret === 'dev-jwt-secret-change-in-production' ||
      jwtSecret.length < 32
    ) {
      console.error(
        'FATAL: JWT_SECRET must be set to a strong value (32+ chars) in production',
      );
      process.exit(1);
    }
  }

  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(new AuditLogInterceptor());

  // レスポンス圧縮（gzip）
  app.use(compression());

  // リクエストボディサイズ制限（1MB）
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // サーバータイムアウト（30秒）
  const server = app.getHttpServer();
  server.setTimeout(30000);

  // WP-1: Helmet セキュリティヘッダー
  app.use(
    helmet({
      contentSecurityPolicy: isProduction ? undefined : false,
      hsts: isProduction ? { maxAge: 31536000, includeSubDomains: true } : false,
    }),
  );

  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new SanitizePipe(),
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // WP-3: CORS環境別ホワイトリスト
  if (isProduction && process.env.CORS_ORIGINS) {
    const allowedOrigins = process.env.CORS_ORIGINS.split(',').map((o) =>
      o.trim(),
    );
    app.enableCors({
      origin: allowedOrigins,
      credentials: true,
    });
  } else {
    app.enableCors();
  }

  const config = new DocumentBuilder()
    .setTitle('まもりトーク API')
    .setDescription(
      '特殊詐欺・強盗対策アプリ「まもりトーク」のバックエンドAPIです。' +
      '認証、イベント管理、AI解析、ブロックリスト、統計などの機能を提供します。' +
      '\n\n### 共通レスポンスヘッダー\n' +
      '| ヘッダー | 説明 |\n' +
      '|---------|------|\n' +
      '| X-Request-ID | リクエスト追跡ID（相関ID） |\n' +
      '| X-RateLimit-Limit | レート制限の上限値 |\n' +
      '| X-RateLimit-Remaining | 残りリクエスト数 |\n' +
      '| X-RateLimit-Reset | 制限リセット時刻（Unix秒） |',
    )
    .setVersion('0.2.0')
    .addBearerAuth({
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
      description: 'JWTアクセストークンを入力してください',
    })
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document, {
    customSiteTitle: 'まもりトーク API ドキュメント',
    customJs: [
      'https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js',
      'https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-standalone-preset.js',
    ],
    customCssUrl: [
      'https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css',
    ],
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: 'list',
      filter: true,
      tagsSorter: 'alpha',
    },
  });

  // グレースフルシャットダウン
  app.enableShutdownHooks();

  const port = process.env.PORT || 3000;
  await app.listen(port);

  const logger = app.get(Logger);
  logger.log(`MamoriTalk API running on port ${port}`);
}
bootstrap();
