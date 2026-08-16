import { DirectoryEntry, SubtreeStats } from '../../application/ports/data-room.queries';
import { DataRoomFile } from '../../domain/file';
import { Folder } from '../../domain/folder';

export const asBytes = (value: bigint): string => value.toString();

export const presentFolder = (folder: Folder) => ({
  kind: 'folder' as const,
  id: folder.id,
  name: folder.name.value,
  parentId: folder.parentId,
  depth: folder.depth,
});

export const presentFile = (file: DataRoomFile) => ({
  kind: 'file' as const,
  id: file.id,
  name: file.name.value,
  folderId: file.folderId,
  sizeBytes: asBytes(file.content.sizeBytes),
  contentType: file.content.contentType,
  versionNumber: file.versionNumber,
});

export const presentEntry = (entry: DirectoryEntry) =>
  entry.kind === 'folder'
    ? {
        kind: 'folder' as const,
        id: entry.id,
        name: entry.name,
        updatedAt: entry.updatedAt.toISOString(),
      }
    : {
        kind: 'file' as const,
        id: entry.id,
        name: entry.name,
        updatedAt: entry.updatedAt.toISOString(),
        sizeBytes: asBytes(entry.sizeBytes),
        contentType: entry.contentType,
        versionNumber: entry.versionNumber,
      };

export const presentStats = (stats: SubtreeStats) => ({
  folderCount: stats.folderCount,
  fileCount: stats.fileCount,
  totalSizeBytes: asBytes(stats.totalSizeBytes),
});
