/**
 * Mirrors the API's response shapes.
 *
 * Byte counts arrive as strings: they are BigInt on the server and JSON has no
 * integer type wide enough to carry them safely.
 */

export interface User {
  id: string;
  email: string;
  name: string | null;
}

export interface Session {
  user: User;
  accessToken: string;
  expiresInSeconds: number;
}

export interface DataRoom {
  id: string;
  name: string;
  createdAt: string;
}

export interface FolderEntry {
  kind: 'folder';
  id: string;
  name: string;
  updatedAt: string;
}

export interface FileEntry {
  kind: 'file';
  id: string;
  name: string;
  updatedAt: string;
  sizeBytes: string;
  contentType: string;
  versionNumber: number;
}

export type DirectoryEntry = FolderEntry | FileEntry;

export interface Page<T> {
  items: T[];
  nextCursor: string | null;
}

export interface Folder {
  kind: 'folder';
  id: string;
  name: string;
  parentId: string | null;
  depth: number;
}

export interface FileResource {
  kind: 'file';
  id: string;
  name: string;
  folderId: string | null;
  sizeBytes: string;
  contentType: string;
  versionNumber: number;
}

export interface CommittedFile extends FileResource {
  /** True when an existing file gained a version rather than a new row appearing. */
  versioned: boolean;
}

export interface Breadcrumb {
  id: string;
  name: string;
}

export interface SubtreeStats {
  folderCount: number;
  fileCount: number;
  totalSizeBytes: string;
}

export interface UploadTicket {
  uploadUrl: string;
  pathname: string;
  expiresAt: string;
}

export interface FileUrl {
  url: string;
  expiresInSeconds: number;
  name: string;
  contentType: string;
  sizeBytes: string;
}

export type ShareMode = 'PUBLIC_LINK' | 'RESTRICTED';
export type ShareSubjectType = 'DATA_ROOM' | 'FOLDER' | 'FILE';

export interface Share {
  id: string;
  subjectType: ShareSubjectType;
  mode: ShareMode;
  role: 'VIEWER';
  granteeUserId: string | null;
  token: string | null;
  expiresAt: string | null;
  revokedAt: string | null;
}

export interface SharedRoomSummary {
  shareId: string;
  dataRoomId: string;
  dataRoomName: string;
  ownerEmail: string;
  subjectType: ShareSubjectType;
  subjectFolderId: string | null;
  subjectFileId: string | null;
}

export interface ResolvedShareLink {
  dataRoomId: string;
  dataRoomName: string;
  subjectType: ShareSubjectType;
  subjectFolderId: string | null;
  subjectFileId: string | null;
}
