import { Injectable, Logger } from '@nestjs/common';
import { NotFoundError } from '../../../../shared/domain/domain-error';
import { AccessResolver, Caller } from '../../../sharing/application/access-resolver';
import { StoragePort } from '../../../storage/application/ports/storage.port';
import { DataRoomQueriesPort, SubtreeStats } from '../ports/data-room.queries';
import { FolderRepositoryPort } from '../ports/folder.repository';

export interface DeleteFolderCommand {
  dataRoomId: string;
  folderId: string;
}

@Injectable()
export class DeleteFolderHandler {
  private readonly logger = new Logger(DeleteFolderHandler.name);

  constructor(
    private readonly folders: FolderRepositoryPort,
    private readonly queries: DataRoomQueriesPort,
    private readonly storage: StoragePort,
    private readonly access: AccessResolver,
  ) {}

  async preview(caller: Caller, command: DeleteFolderCommand): Promise<SubtreeStats> {
    const folder = await this.folders.findById(command.dataRoomId, command.folderId);
    if (!folder) throw new NotFoundError('Folder not found');

    await this.access.requireRead(caller, {
      kind: 'FOLDER',
      dataRoomId: folder.dataRoomId,
      folderId: folder.id,
      path: folder.path,
    });

    return this.queries.subtreeStats(command.dataRoomId, folder.path.value);
  }

  async execute(caller: Caller, command: DeleteFolderCommand): Promise<SubtreeStats> {
    const folder = await this.folders.findById(command.dataRoomId, command.folderId);
    if (!folder) throw new NotFoundError('Folder not found');

    await this.access.requireWrite(caller, {
      kind: 'FOLDER',
      dataRoomId: folder.dataRoomId,
      folderId: folder.id,
      path: folder.path,
    });

    const removed = await this.queries.subtreeStats(
      command.dataRoomId,
      folder.path.value,
    );
    const blobs = await this.folders.listBlobPathnamesUnder(
      command.dataRoomId,
      folder.path,
    );

    await this.folders.delete(command.dataRoomId, command.folderId);

    if (blobs.length) {
      try {
        await this.storage.delete(blobs);
      } catch (error) {
        this.logger.error(
          `Deleted folder ${command.folderId} but left ${blobs.length} blob(s) behind`,
          error instanceof Error ? error.stack : undefined,
        );
      }
    }

    return removed;
  }
}
