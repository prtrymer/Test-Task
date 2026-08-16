import { Injectable } from '@nestjs/common';
import { ConflictError, NotFoundError } from '../../../../shared/domain/domain-error';
import { isUniqueViolation } from '../../../../shared/application/unique-violation';
import { AccessResolver, Caller } from '../../../sharing/application/access-resolver';
import { Folder } from '../../domain/folder';
import { FolderRepositoryPort } from '../ports/folder.repository';

@Injectable()
export class RenameFolderHandler {
  constructor(
    private readonly folders: FolderRepositoryPort,
    private readonly access: AccessResolver,
  ) {}

  async execute(
    caller: Caller,
    input: { dataRoomId: string; folderId: string; name: string },
  ): Promise<Folder> {
    const folder = await this.folders.findById(input.dataRoomId, input.folderId);
    if (!folder) throw new NotFoundError('Folder not found');

    await this.access.requireWrite(caller, {
      kind: 'FOLDER',
      dataRoomId: folder.dataRoomId,
      folderId: folder.id,
      path: folder.path,
    });

    folder.rename(input.name);

    try {
      await this.folders.update(folder);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictError(
          `A folder named "${folder.name.value}" already exists here`,
        );
      }
      throw error;
    }

    return folder;
  }
}
