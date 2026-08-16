import { INestApplication, ValidationPipe } from '@nestjs/common';
import { DomainExceptionFilter } from './shared/interface/http/domain-exception.filter';

export function configureApp(app: INestApplication): void {
  app.enableCors({
    origin: buildOriginCheck(process.env.CORS_ORIGIN),
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

type OriginCheck = (
  origin: string | undefined,
  callback: (error: Error | null, allow?: boolean) => void,
) => void;

function buildOriginCheck(raw: string | undefined): OriginCheck {
  const patterns = (raw ?? 'http://localhost:3000')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  const exact = new Set(patterns.filter((p) => !p.includes('*')));
  const wildcards = patterns
    .filter((p) => p.includes('*'))
    .map((p) => new RegExp(`^${p.split('*').map(escapeRegExp).join('[^.]*')}$`));

  return (origin, callback) => {
    if (!origin) return callback(null, true);
    const allowed = exact.has(origin) || wildcards.some((re) => re.test(origin));
    return callback(null, allowed);
  };
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
