import { Injectable } from '@nestjs/common';
import { NotFoundError, ValidationError } from '../../../../shared/domain/domain-error';
import { IdGeneratorPort } from '../../../../shared/application/ports/id-generator.port';
import { ResourceName } from '../../../../shared/domain/resource-name';
import { AccessResolver, Caller } from '../../../sharing/application/access-resolver';
import {
  StoragePort,
  UploadTicket,
} from '../../../storage/application/ports/storage.port';
import { FolderRepositoryPort } from '../ports/folder.repository';

export interface RequestUploadCommand {
  dataRoomId: string;
  folderId: string | null;
  name: string;
  contentType: string;
}

/** 100 MB. Generous for due-diligence PDFs, bounded enough to be a real limit. */
const MAX_UPLOAD_BYTES = 100 * 1024 * 1024;

const ALLOWED_CONTENT_TYPES = ['application/pdf'];

/**
 * Step one of an upload: authorise, then hand the browser a ticket so it can
 * send the bytes straight to storage. Nothing is written to the database yet —
 * an abandoned upload leaves a stray blob, never a phantom file row.
 */
@Injectable()
export class RequestUploadHandler {
  constructor(
    private readonly folders: FolderRepositoryPort,
    private readonly storage: StoragePort,
    private readonly access: AccessResolver,
    private readonly ids: IdGeneratorPort,
  ) {}

  async execute(caller: Caller, command: RequestUploadCommand): Promise<UploadTicket> {
    if (!ALLOWED_CONTENT_TYPES.includes(command.contentType)) {
      throw new ValidationError('Only PDF files can be uploaded');
    }

    // Validate the name now rather than after the bytes have been transferred.
    const name = ResourceName.create(command.name);

    if (command.folderId) {
      const folder = await this.folders.findById(command.dataRoomId, command.folderId);
      if (!folder) throw new NotFoundError('Folder not found');
    }

    await this.access.requireWrite(caller, {
      kind: 'DATA_ROOM',
      dataRoomId: command.dataRoomId,
    });

    // Blobs are immutable and never reuse a pathname, so overwriting a name
    // cannot silently replace an earlier version's bytes.
    const pathname = `${command.dataRoomId}/${this.ids.generate()}/${name.value}`;

    return this.storage.createUploadTicket({
      pathname,
      contentType: command.contentType,
      maxSizeBytes: MAX_UPLOAD_BYTES,
    });
  }
}
