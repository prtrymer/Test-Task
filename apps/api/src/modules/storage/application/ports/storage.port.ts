export interface UploadTicket {
  uploadUrl: string;
  pathname: string;
  expiresAt: Date;
}

export interface StoredObject {
  sizeBytes: bigint;
  contentType: string;
}

export abstract class StoragePort {
  abstract createUploadTicket(input: {
    pathname: string;
    contentType: string;
    maxSizeBytes: number;
  }): Promise<UploadTicket>;

  abstract createReadUrl(pathname: string, ttlSeconds: number): Promise<string>;

  abstract head(pathname: string): Promise<StoredObject | null>;

  abstract delete(pathnames: string[]): Promise<void>;
}
