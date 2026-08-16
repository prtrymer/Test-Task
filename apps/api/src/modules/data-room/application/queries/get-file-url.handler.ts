import { Injectable } from '@nestjs/common';
import { NotFoundError } from '../../../../shared/domain/domain-error';
import { AccessResolver, Caller } from '../../../sharing/application/access-resolver';
import { StoragePort } from '../../../storage/application/ports/storage.port';
import { FileRepositoryPort } from '../ports/file.repository';

export interface GetFileUrlQuery {
  dataRoomId: string;
  fileId: string;
}

export interface FileUrl {
  url: string;
  expiresInSeconds: number;
  name: string;
  contentType: string;
  sizeBytes: bigint;
}

/**
 * Issues a short-lived URL the browser fetches directly from storage.
 *
 * The TTL is deliberately small. Revoking a share cannot invalidate a signed
 * URL that has already been handed out, so the window during which a revoked
 * viewer can still read the bytes is exactly this number.
 */
const READ_URL_TTL_SECONDS = 300;

@Injectable()
export class GetFileUrlHandler {
  constructor(
    private readonly files: FileRepositoryPort,
    private readonly storage: StoragePort,
    private readonly access: AccessResolver,
  ) {}

  async execute(caller: Caller, query: GetFileUrlQuery): Promise<FileUrl> {
    const file = await this.files.findById(query.dataRoomId, query.fileId);
    if (!file) throw new NotFoundError('File not found');

    await this.access.requireRead(caller, {
      kind: 'FILE',
      dataRoomId: file.dataRoomId,
      fileId: file.id,
      path: file.path,
    });

    const url = await this.storage.createReadUrl(
      file.content.blobPathname,
      READ_URL_TTL_SECONDS,
    );

    return {
      url,
      expiresInSeconds: READ_URL_TTL_SECONDS,
      name: file.name.value,
      contentType: file.content.contentType,
      sizeBytes: file.content.sizeBytes,
    };
  }
}
