import { Module } from '@nestjs/common';
import { StoragePort } from './application/ports/storage.port';
import { VercelBlobStorage } from './infrastructure/vercel-blob.adapter';

/**
 * The port is what the rest of the application depends on; swapping Vercel Blob
 * for S3 is a change to this one binding.
 */
@Module({
  providers: [{ provide: StoragePort, useClass: VercelBlobStorage }],
  exports: [StoragePort],
})
export class StorageModule {}
