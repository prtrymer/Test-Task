import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../shared/infrastructure/prisma/prisma.service';

interface HealthReport {
  status: 'ok' | 'degraded';
  database: 'reachable' | 'unreachable';
  storage: 'configured' | 'missing-token';
  corsAllowedOrigins: string[];
  region: string | null;
}

@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  @Get()
  async check(): Promise<HealthReport> {
    const database = await this.pingDatabase();
    const storage = this.config.get<string>('BLOB_READ_WRITE_TOKEN')
      ? 'configured'
      : 'missing-token';

    const corsAllowedOrigins = (this.config.get<string>('CORS_ORIGIN') ?? '')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean);

    return {
      status: database === 'reachable' && storage === 'configured' ? 'ok' : 'degraded',
      database,
      storage,
      corsAllowedOrigins,
      region: process.env.VERCEL_REGION ?? null,
    };
  }

  private async pingDatabase(): Promise<'reachable' | 'unreachable'> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return 'reachable';
    } catch {
      return 'unreachable';
    }
  }
}
