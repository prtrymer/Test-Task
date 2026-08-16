import { Module } from '@nestjs/common';
import { StoragePort } from './application/ports/storage.port';
import { VercelBlobStorage } from './infrastructure/vercel-blob.adapter';

@Module({
  providers: [{ provide: StoragePort, useClass: VercelBlobStorage }],
  exports: [StoragePort],
})
export class StorageModule {}
