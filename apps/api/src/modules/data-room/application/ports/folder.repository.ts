import { Folder } from '../../domain/folder';
import { MaterializedPath } from '../../../../shared/domain/materialized-path';

export abstract class FolderRepositoryPort {
  abstract findById(dataRoomId: string, id: string): Promise<Folder | null>;

  abstract insert(folder: Folder): Promise<void>;

  abstract update(folder: Folder): Promise<void>;

  abstract delete(dataRoomId: string, id: string): Promise<void>;

  abstract applyMove(input: {
    folder: Folder;
    from: MaterializedPath;
    to: MaterializedPath;
  }): Promise<void>;

  abstract listBlobPathnamesUnder(
    dataRoomId: string,
    path: MaterializedPath,
  ): Promise<string[]>;
}
