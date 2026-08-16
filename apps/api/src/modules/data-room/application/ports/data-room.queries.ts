/**
 * The read side. Queries return flat rows straight from SQL rather than
 * rehydrating domain objects — a folder holding 100,000 files must not
 * reconstruct 100,000 aggregates to render one page.
 */

export interface Page<T> {
  items: T[];
  /** Keyset cursor. Null when the last page has been reached. */
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
  /**
   * Direct children of a folder, folders before files. Paginated by keyset
   * rather than OFFSET, which degrades linearly with depth into the listing.
   */
  abstract listDirectory(input: {
    dataRoomId: string;
    folderId: string | null;
    cursor: string | null;
    limit: number;
    sort: DirectorySort;
  }): Promise<Page<DirectoryEntry>>;

  /** Ancestor chain, resolved from the materialised path in one query. */
  abstract breadcrumbs(dataRoomId: string, folderId: string): Promise<Breadcrumb[]>;

  /**
   * Size and item count for a whole subtree. One prefix scan over the
   * `(dataRoomId, path text_pattern_ops)` index — no recursion, no tree walk.
   * `path` is a folder's own path; the subtree pattern is derived from it.
   */
  abstract subtreeStats(dataRoomId: string, path: string): Promise<SubtreeStats>;

  /** Substring match on file name across a data room, via the trigram index. */
  abstract searchFiles(input: {
    dataRoomId: string;
    term: string;
    cursor: string | null;
    limit: number;
    /** Restricts results to a subtree, for search inside a shared folder. */
    withinPath?: string;
  }): Promise<Page<FileEntry>>;
}
