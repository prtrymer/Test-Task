export interface UploadTicket {
  /**
   * Presigned URL the browser PUTs the bytes to. Scoped to one pathname, one
   * operation and one expiry, with the content type and size ceiling enforced
   * by the storage edge rather than trusted from the client.
   */
  uploadUrl: string;
  pathname: string;
  expiresAt: Date;
}

export interface StoredObject {
  sizeBytes: bigint;
  contentType: string;
}

/**
 * Blob storage, minus the provider.
 *
 * Bytes never pass through the API: Vercel functions cap request and response
 * bodies at 4.5 MB, so the browser uploads to storage directly with a ticket
 * and reads through a short-lived signed URL. Both directions are authorised
 * here, at the point the credential is issued.
 */
export abstract class StoragePort {
  abstract createUploadTicket(input: {
    pathname: string;
    contentType: string;
    maxSizeBytes: number;
  }): Promise<UploadTicket>;

  /**
   * A URL the browser can fetch for `ttlSeconds`. Kept short: revocation
   * cannot retract a URL already issued, so the window is the exposure.
   */
  abstract createReadUrl(pathname: string, ttlSeconds: number): Promise<string>;

  abstract head(pathname: string): Promise<StoredObject | null>;

  abstract delete(pathnames: string[]): Promise<void>;
}
