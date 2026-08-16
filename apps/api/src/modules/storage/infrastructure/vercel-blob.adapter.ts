import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BlobNotFoundError, del, head, issueSignedToken, presignUrl } from '@vercel/blob';
import {
  StoragePort,
  StoredObject,
  UploadTicket,
} from '../application/ports/storage.port';

const UPLOAD_WINDOW_SECONDS = 60 * 30;

@Injectable()
export class VercelBlobStorage extends StoragePort {
  private readonly logger = new Logger(VercelBlobStorage.name);
  private readonly auth: { token?: string };

  constructor(config: ConfigService) {
    super();
    const token = config.get<string>('BLOB_READ_WRITE_TOKEN')?.trim();
    this.auth = token ? { token } : {};
  }

  async createUploadTicket(input: {
    pathname: string;
    contentType: string;
    maxSizeBytes: number;
  }): Promise<UploadTicket> {
    const validUntil = Date.now() + UPLOAD_WINDOW_SECONDS * 1000;

    const signed = await issueSignedToken({
      ...this.auth,
      pathname: input.pathname,
      operations: ['put'],
      validUntil,
      allowedContentTypes: [input.contentType],
      maximumSizeInBytes: input.maxSizeBytes,
    });

    const { presignedUrl } = await presignUrl(signed, {
      access: 'private',
      operation: 'put',
      pathname: input.pathname,
      validUntil,
      allowedContentTypes: [input.contentType],
      maximumSizeInBytes: input.maxSizeBytes,

      allowOverwrite: false,

      addRandomSuffix: false,
    });

    return {
      uploadUrl: presignedUrl,
      pathname: input.pathname,
      expiresAt: new Date(validUntil),
    };
  }

  async createReadUrl(pathname: string, ttlSeconds: number): Promise<string> {
    const validUntil = Date.now() + ttlSeconds * 1000;

    const signed = await issueSignedToken({
      ...this.auth,
      pathname,
      operations: ['get'],
      validUntil,
    });

    const { presignedUrl } = await presignUrl(signed, {
      access: 'private',
      operation: 'get',
      pathname,
      validUntil,
    });

    return presignedUrl;
  }

  async head(pathname: string): Promise<StoredObject | null> {
    try {
      const blob = await head(pathname, { ...this.auth });
      return {
        sizeBytes: BigInt(blob.size),
        contentType: blob.contentType ?? 'application/octet-stream',
      };
    } catch (error) {
      if (error instanceof BlobNotFoundError) return null;
      throw error;
    }
  }

  async delete(pathnames: string[]): Promise<void> {
    if (!pathnames.length) return;
    await del(pathnames, { ...this.auth });
  }
}
