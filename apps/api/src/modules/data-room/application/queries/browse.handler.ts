import { Injectable } from '@nestjs/common';
import { NotFoundError } from '../../../../shared/domain/domain-error';
import { AccessResolver, Caller } from '../../../sharing/application/access-resolver';
import {
  Breadcrumb,
  DataRoomQueriesPort,
  DirectoryEntry,
  DirectorySort,
  FileEntry,
  Page,
  SubtreeStats,
} from '../ports/data-room.queries';
import { FolderRepositoryPort } from '../ports/folder.repository';

export const MAX_PAGE_SIZE = 100;
export const DEFAULT_PAGE_SIZE = 50;

/** Read-side entry point: listing, breadcrumbs, subtree totals and search. */
@Injectable()
export class BrowseHandler {
  constructor(
    private readonly queries: DataRoomQueriesPort,
    private readonly folders: FolderRepositoryPort,
    private readonly access: AccessResolver,
  ) {}

  async listDirectory(
    caller: Caller,
    input: {
      dataRoomId: string;
      folderId: string | null;
      cursor: string | null;
      limit?: number;
      sort?: DirectorySort;
    },
  ): Promise<Page<DirectoryEntry>> {
    await this.authoriseFolder(caller, input.dataRoomId, input.folderId);

    return this.queries.listDirectory({
      dataRoomId: input.dataRoomId,
      folderId: input.folderId,
      cursor: input.cursor,
      limit: clampLimit(input.limit),
      sort: input.sort ?? 'name',
    });
  }

  async breadcrumbs(
    caller: Caller,
    dataRoomId: string,
    folderId: string,
  ): Promise<Breadcrumb[]> {
    await this.authoriseFolder(caller, dataRoomId, folderId);
    return this.queries.breadcrumbs(dataRoomId, folderId);
  }

  async folderStats(
    caller: Caller,
    dataRoomId: string,
    folderId: string,
  ): Promise<SubtreeStats> {
    const folder = await this.authoriseFolder(caller, dataRoomId, folderId);
    if (!folder) throw new NotFoundError('Folder not found');
    return this.queries.subtreeStats(dataRoomId, folder.path.value);
  }

  /**
   * Search is scoped to what the caller may see: a recipient holding only a
   * folder share searches that subtree, never the whole room.
   */
  async search(
    caller: Caller,
    input: {
      dataRoomId: string;
      term: string;
      cursor: string | null;
      limit?: number;
      withinFolderId?: string | null;
    },
  ): Promise<Page<FileEntry>> {
    const decision = await this.access.requireRead(caller, {
      kind: 'DATA_ROOM',
      dataRoomId: input.dataRoomId,
    });

    let withinPath: string | undefined;

    if (input.withinFolderId) {
      const folder = await this.folders.findById(input.dataRoomId, input.withinFolderId);
      if (!folder) throw new NotFoundError('Folder not found');
      withinPath = folder.path.value;
    } else if (decision.source === 'SHARE') {
      const subject = decision.grantedBy?.subject;
      if (subject?.type === 'FOLDER') withinPath = subject.path.value;
    }

    return this.queries.searchFiles({
      dataRoomId: input.dataRoomId,
      term: input.term,
      cursor: input.cursor,
      limit: clampLimit(input.limit),
      withinPath,
    });
  }

  /** Authorises the folder itself when given, the room otherwise. */
  private async authoriseFolder(
    caller: Caller,
    dataRoomId: string,
    folderId: string | null,
  ) {
    if (!folderId) {
      await this.access.requireRead(caller, { kind: 'DATA_ROOM', dataRoomId });
      return null;
    }

    const folder = await this.folders.findById(dataRoomId, folderId);
    if (!folder) throw new NotFoundError('Folder not found');

    await this.access.requireRead(caller, {
      kind: 'FOLDER',
      dataRoomId,
      folderId: folder.id,
      path: folder.path,
    });

    return folder;
  }
}

function clampLimit(limit?: number): number {
  if (!limit || limit < 1) return DEFAULT_PAGE_SIZE;
  return Math.min(limit, MAX_PAGE_SIZE);
}
