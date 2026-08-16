import { Injectable, Logger } from '@nestjs/common';
import { ConflictError, NotFoundError } from '../../../../shared/domain/domain-error';
import { isUniqueViolation } from '../../../../shared/application/unique-violation';
import { AccessResolver, Caller } from '../../../sharing/application/access-resolver';
import { StoragePort } from '../../../storage/application/ports/storage.port';
import { DataRoomFile } from '../../domain/file';
import { FileRepositoryPort } from '../ports/file.repository';
import { FolderRepositoryPort } from '../ports/folder.repository';

/** Rename, move and delete for a single file. */
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
    file.rename(input.name);

    try {
      await this.files.update(file);
    } catch (error) {
      // Uploads resolve a name clash by versioning; a rename cannot, because
      // the two files have separate histories. Surfacing the conflict lets the
      // UI offer a suffixed alternative.
      if (isUniqueViolation(error)) {
        throw new ConflictError(
          `A file named "${file.name.value}" already exists in this folder`,
        );
      }
      throw error;
    }

    return file;
  }

  async move(
    caller: Caller,
    input: { dataRoomId: string; fileId: string; folderId: string | null },
  ): Promise<DataRoomFile> {
    const file = await this.load(caller, input.dataRoomId, input.fileId);

    const folder = input.folderId
      ? await this.folders.findById(input.dataRoomId, input.folderId)
      : null;
    if (input.folderId && !folder) throw new NotFoundError('Destination folder not found');

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

    // Every version's blob, not just the current one.
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
