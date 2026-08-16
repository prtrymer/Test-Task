import { Injectable } from '@nestjs/common';
import { ConflictError, NotFoundError } from '../../../../shared/domain/domain-error';
import { IdGeneratorPort } from '../../../../shared/application/ports/id-generator.port';
import { AccessResolver, Caller } from '../../../sharing/application/access-resolver';
import { Folder } from '../../domain/folder';
import { FolderRepositoryPort } from '../ports/folder.repository';
import { isUniqueViolation } from '../../../../shared/application/unique-violation';

export interface CreateFolderCommand {
  dataRoomId: string;
  parentId: string | null;
  name: string;
}

@Injectable()
export class CreateFolderHandler {
  constructor(
    private readonly folders: FolderRepositoryPort,
    private readonly access: AccessResolver,
    private readonly ids: IdGeneratorPort,
  ) {}

  async execute(caller: Caller, command: CreateFolderCommand): Promise<Folder> {
    const parent = command.parentId
      ? await this.folders.findById(command.dataRoomId, command.parentId)
      : null;

    if (command.parentId && !parent) {
      throw new NotFoundError('Parent folder not found');
    }

    await this.access.requireWrite(caller, {
      kind: 'DATA_ROOM',
      dataRoomId: command.dataRoomId,
    });

    const folder = Folder.create({
      id: this.ids.generate(),
      dataRoomId: command.dataRoomId,
      parent,
      name: command.name,
    });

    try {
      await this.folders.insert(folder);
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
