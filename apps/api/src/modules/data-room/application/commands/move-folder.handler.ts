import { Injectable } from '@nestjs/common';
import { ConflictError, NotFoundError } from '../../../../shared/domain/domain-error';
import { AccessResolver, Caller } from '../../../sharing/application/access-resolver';
import { Folder } from '../../domain/folder';
import { FolderRepositoryPort } from '../ports/folder.repository';
import { isUniqueViolation } from '../../../../shared/application/unique-violation';

export interface MoveFolderCommand {
  dataRoomId: string;
  folderId: string;
  newParentId: string | null;
}

@Injectable()
export class MoveFolderHandler {
  constructor(
    private readonly folders: FolderRepositoryPort,
    private readonly access: AccessResolver,
  ) {}

  async execute(caller: Caller, command: MoveFolderCommand): Promise<Folder> {
    const folder = await this.folders.findById(command.dataRoomId, command.folderId);
    if (!folder) throw new NotFoundError('Folder not found');

    await this.access.requireWrite(caller, {
      kind: 'FOLDER',
      dataRoomId: folder.dataRoomId,
      folderId: folder.id,
      path: folder.path,
    });

    const newParent = command.newParentId
      ? await this.folders.findById(command.dataRoomId, command.newParentId)
      : null;

    if (command.newParentId && !newParent) {
      throw new NotFoundError('Destination folder not found');
    }

    // Rejects cycles and cross-room moves; returns the rewrite descendants need.
    const { from, to } = folder.moveTo(newParent);

    try {
      await this.folders.applyMove({ folder, from, to });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictError(
          `A folder named "${folder.name.value}" already exists in the destination`,
        );
      }
      throw error;
    }

    return folder;
  }
}
