import { Injectable } from '@nestjs/common';
import { NotFoundError, ValidationError } from '../../../../shared/domain/domain-error';
import { IdGeneratorPort } from '../../../../shared/application/ports/id-generator.port';
import { AccessResolver, Caller } from '../../../sharing/application/access-resolver';
import { StoragePort } from '../../../storage/application/ports/storage.port';
import { DataRoomFile } from '../../domain/file';
import { FileRepositoryPort } from '../ports/file.repository';
import { FolderRepositoryPort } from '../ports/folder.repository';

export interface CommitUploadCommand {
  dataRoomId: string;
  folderId: string | null;
  name: string;
  blobPathname: string;
}

export interface CommitUploadResult {
  file: DataRoomFile;

  versioned: boolean;
}

@Injectable()
export class CommitUploadHandler {
  constructor(
    private readonly files: FileRepositoryPort,
    private readonly folders: FolderRepositoryPort,
    private readonly storage: StoragePort,
    private readonly access: AccessResolver,
    private readonly ids: IdGeneratorPort,
  ) {}

  async execute(
    caller: Caller,
    command: CommitUploadCommand,
  ): Promise<CommitUploadResult> {
    await this.access.requireWrite(caller, {
      kind: 'DATA_ROOM',
      dataRoomId: command.dataRoomId,
    });

    const uploaderId = caller.userId;
    if (!uploaderId) throw new ValidationError('Uploads require a signed-in user');

    const stored = await this.storage.head(command.blobPathname);
    if (!stored) {
      throw new ValidationError('The upload did not complete');
    }
    if (!command.blobPathname.startsWith(`${command.dataRoomId}/`)) {
      throw new ValidationError('That blob does not belong to this data room');
    }

    const folder = command.folderId
      ? await this.folders.findById(command.dataRoomId, command.folderId)
      : null;
    if (command.folderId && !folder) {
      throw new NotFoundError('Folder not found');
    }

    const content = {
      sizeBytes: stored.sizeBytes,
      contentType: stored.contentType,
      blobPathname: command.blobPathname,
    };

    const existing = await this.files.findByName(
      command.dataRoomId,
      command.folderId,
      command.name.trim(),
    );

    if (existing) {
      existing.addVersion(content);
      await this.files.appendVersion(existing, uploaderId);
      return { file: existing, versioned: true };
    }

    const file = DataRoomFile.create({
      id: this.ids.generate(),
      dataRoomId: command.dataRoomId,
      folder: folder
        ? { id: folder.id, dataRoomId: folder.dataRoomId, path: folder.path }
        : null,
      name: command.name,
      content,
    });

    await this.files.insert(file, uploaderId);
    return { file, versioned: false };
  }
}
