import { INestApplication, ValidationPipe } from '@nestjs/common';
import { DomainExceptionFilter } from './shared/interface/http/domain-exception.filter';

/**
 * Shared by the local server and the serverless entry point, so the two cannot
 * drift — a pipe or filter missing only in production is the kind of bug that
 * surfaces as a security hole rather than a crash.
 */
export function configureApp(app: INestApplication): void {
  app.enableCors({
    origin: parseOrigins(process.env.CORS_ORIGIN),
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalFilters(new DomainExceptionFilter());
}

/**
 * Comma-separated list. The deployed frontend URL is not known until it has
 * been deployed once, so this is set after the first frontend deploy.
 */
function parseOrigins(raw: string | undefined): string[] {
  return (raw ?? 'http://localhost:3000')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}
