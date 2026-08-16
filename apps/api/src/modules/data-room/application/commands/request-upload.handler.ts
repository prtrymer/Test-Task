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

/** Content types we accept, and the extension their storage key carries. */
const ALLOWED_CONTENT_TYPES: Record<string, string> = {
  'application/pdf': 'pdf',
};

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
    const extension = ALLOWED_CONTENT_TYPES[command.contentType];
    if (!extension) {
      throw new ValidationError('Only PDF files can be uploaded');
    }

    // Validate the name now rather than after the bytes have been transferred.
    ResourceName.create(command.name);

    if (command.folderId) {
      const folder = await this.folders.findById(command.dataRoomId, command.folderId);
      if (!folder) throw new NotFoundError('Folder not found');
    }

    await this.access.requireWrite(caller, {
      kind: 'DATA_ROOM',
      dataRoomId: command.dataRoomId,
    });

    // The storage key is opaque: a generated id, never the user's filename.
    //
    // Three reasons. Vercel Blob round-trips the pathname through its control
    // API and returns non-ASCII mangled — a Cyrillic name comes back as
    // mojibake and the signature scope check then fails, so any such upload
    // would be impossible. The display name already lives in the database, so
    // the key does not need to carry it. And signed URLs embed their path,
    // which would otherwise publish filenames that are often personal data.
    //
    // Keys are never reused, so an overwrite cannot silently replace an
    // earlier version's bytes.
    const pathname = `${command.dataRoomId}/${this.ids.generate()}.${extension}`;

    return this.storage.createUploadTicket({
      pathname,
      contentType: command.contentType,
      maxSizeBytes: MAX_UPLOAD_BYTES,
    });
  }
}
