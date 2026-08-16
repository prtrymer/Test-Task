export interface Page<T> {
  items: T[];

  nextCursor: string | null;
}

export interface FolderEntry {
  kind: 'folder';
  id: string;
  name: string;
  updatedAt: Date;
}

export interface FileEntry {
  kind: 'file';
  id: string;
  name: string;
  sizeBytes: bigint;
  contentType: string;
  versionNumber: number;
  updatedAt: Date;
}

export type DirectoryEntry = FolderEntry | FileEntry;

export interface Breadcrumb {
  id: string;
  name: string;
}

export interface SubtreeStats {
  folderCount: number;
  fileCount: number;
  totalSizeBytes: bigint;
}

export type DirectorySort = 'name' | 'updatedAt';

export abstract class DataRoomQueriesPort {
  abstract listDirectory(input: {
    dataRoomId: string;
    folderId: string | null;
    cursor: string | null;
    limit: number;
    sort: DirectorySort;
  }): Promise<Page<DirectoryEntry>>;

  abstract breadcrumbs(dataRoomId: string, folderId: string): Promise<Breadcrumb[]>;

  abstract subtreeStats(dataRoomId: string, path: string): Promise<SubtreeStats>;

  abstract searchFiles(input: {
    dataRoomId: string;
    term: string;
    cursor: string | null;
    limit: number;

    withinPath?: string;
  }): Promise<Page<FileEntry>>;
}
