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

const MAX_UPLOAD_BYTES = 100 * 1024 * 1024;

const ALLOWED_CONTENT_TYPES: Record<string, string> = {
  'application/pdf': 'pdf',
};

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

    ResourceName.create(command.name);

    if (command.folderId) {
      const folder = await this.folders.findById(command.dataRoomId, command.folderId);
      if (!folder) throw new NotFoundError('Folder not found');
    }

    await this.access.requireWrite(caller, {
      kind: 'DATA_ROOM',
      dataRoomId: command.dataRoomId,
    });

    const pathname = `${command.dataRoomId}/${this.ids.generate()}.${extension}`;

    return this.storage.createUploadTicket({
      pathname,
      contentType: command.contentType,
      maxSizeBytes: MAX_UPLOAD_BYTES,
    });
  }
}
