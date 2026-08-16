import { Injectable, Logger } from '@nestjs/common';
import { ConflictError, NotFoundError } from '../../../../shared/domain/domain-error';
import { isUniqueViolation } from '../../../../shared/application/unique-violation';
import { AccessResolver, Caller } from '../../../sharing/application/access-resolver';
import { StoragePort } from '../../../storage/application/ports/storage.port';
import { ResourceName } from '../../../../shared/domain/resource-name';
import { DataRoomFile } from '../../domain/file';
import { FileRepositoryPort } from '../ports/file.repository';
import { FolderRepositoryPort } from '../ports/folder.repository';

const MAX_SUFFIX_ATTEMPTS = 200;

@Injectable()
export class ManageFileHandler {
  private readonly logger = new Logger(ManageFileHandler.name);

  constructor(
    private readonly files: FileRepositoryPort,
    private readonly folders: FolderRepositoryPort,
    private readonly storage: StoragePort,
    private readonly access: AccessResolver,
  ) {}

  async rename(
    caller: Caller,
    input: { dataRoomId: string; fileId: string; name: string },
  ): Promise<DataRoomFile> {
    const file = await this.load(caller, input.dataRoomId, input.fileId);
    const folderId = file.folderId;
    file.rename(input.name);

    try {
      await this.files.update(file);
    } catch (error) {
      if (isUniqueViolation(error)) {
        const suggestion = await this.firstFreeName(
          input.dataRoomId,
          folderId,
          file.name,
        );
        throw new ConflictError(
          `A file named "${file.name.value}" already exists in this folder`,
          { suggestedName: suggestion.value },
        );
      }
      throw error;
    }

    return file;
  }

  private async firstFreeName(
    dataRoomId: string,
    folderId: string | null,
    desired: ResourceName,
  ): Promise<ResourceName> {
    const taken = new Set(
      await this.files.listNamesStartingWith(dataRoomId, folderId, desired.stem),
    );

    for (let n = 2; n <= MAX_SUFFIX_ATTEMPTS; n++) {
      const candidate = desired.withSuffix(n);
      if (!taken.has(candidate.value)) return candidate;
    }

    return desired.withSuffix(Date.now());
  }

  async move(
    caller: Caller,
    input: { dataRoomId: string; fileId: string; folderId: string | null },
  ): Promise<DataRoomFile> {
    const file = await this.load(caller, input.dataRoomId, input.fileId);

    const folder = input.folderId
      ? await this.folders.findById(input.dataRoomId, input.folderId)
      : null;
    if (input.folderId && !folder)
      throw new NotFoundError('Destination folder not found');

    file.moveTo(
      folder ? { id: folder.id, dataRoomId: folder.dataRoomId, path: folder.path } : null,
    );

    try {
      await this.files.update(file);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictError(
          `A file named "${file.name.value}" already exists in the destination`,
        );
      }
      throw error;
    }

    return file;
  }

  async remove(
    caller: Caller,
    input: { dataRoomId: string; fileId: string },
  ): Promise<void> {
    await this.load(caller, input.dataRoomId, input.fileId);

    const blobs = await this.files.listBlobPathnames(input.dataRoomId, input.fileId);
    await this.files.delete(input.dataRoomId, input.fileId);

    if (blobs.length) {
      try {
        await this.storage.delete(blobs);
      } catch (error) {
        this.logger.error(
          `Deleted file ${input.fileId} but left ${blobs.length} blob(s) behind`,
          error instanceof Error ? error.stack : undefined,
        );
      }
    }
  }

  private async load(
    caller: Caller,
    dataRoomId: string,
    fileId: string,
  ): Promise<DataRoomFile> {
    const file = await this.files.findById(dataRoomId, fileId);
    if (!file) throw new NotFoundError('File not found');

    await this.access.requireWrite(caller, {
      kind: 'FILE',
      dataRoomId: file.dataRoomId,
      fileId: file.id,
      path: file.path,
    });

    return file;
  }
}
