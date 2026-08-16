import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../shared/infrastructure/prisma/prisma.service';

type StorageAuth = 'read-write-token' | 'oidc' | 'unconfigured';

interface HealthReport {
  status: 'ok' | 'degraded';
  database: 'reachable' | 'unreachable';
  storage: 'configured' | 'unconfigured';
  storageAuth: StorageAuth;
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
    const storageAuth = this.resolveStorageAuth();
    const storage = storageAuth === 'unconfigured' ? 'unconfigured' : 'configured';

    const corsAllowedOrigins = (this.config.get<string>('CORS_ORIGIN') ?? '')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean);

    return {
      status: database === 'reachable' && storage === 'configured' ? 'ok' : 'degraded',
      database,
      storage,
      storageAuth,
      corsAllowedOrigins,
      region: process.env.VERCEL_REGION ?? null,
    };
  }

  private resolveStorageAuth(): StorageAuth {
    if (this.config.get<string>('BLOB_READ_WRITE_TOKEN')?.trim()) {
      return 'read-write-token';
    }
    if (this.config.get<string>('BLOB_STORE_ID')?.trim()) {
      return 'oidc';
    }
    return 'unconfigured';
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
