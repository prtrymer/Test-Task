import { Folder } from '../../domain/folder';
import { MaterializedPath } from '../../../../shared/domain/materialized-path';

export abstract class FolderRepositoryPort {
  /** Scoped by data room: no read is allowed to cross the partition key. */
  abstract findById(dataRoomId: string, id: string): Promise<Folder | null>;

  abstract insert(folder: Folder): Promise<void>;

  abstract update(folder: Folder): Promise<void>;

  /** Cascades to descendants, files, versions and shares in the database. */
  abstract delete(dataRoomId: string, id: string): Promise<void>;

  /**
   * Persists a move and rewrites every descendant path in one transaction.
   * These cannot be separate calls: a failure between them would leave the
   * subtree pointing at a prefix that no longer exists.
   */
  abstract applyMove(input: {
    folder: Folder;
    from: MaterializedPath;
    to: MaterializedPath;
  }): Promise<void>;

  /** Blob pathnames beneath a subtree, so storage can be cleaned up after a delete. */
  abstract listBlobPathnamesUnder(
    dataRoomId: string,
    path: MaterializedPath,
  ): Promise<string[]>;
}
