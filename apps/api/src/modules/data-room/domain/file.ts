import { ValidationError } from '../../../shared/domain/domain-error';
import { MaterializedPath } from '../../../shared/domain/materialized-path';
import { ResourceName } from '../../../shared/domain/resource-name';

export interface FileContent {
  sizeBytes: bigint;
  contentType: string;
  blobPathname: string;
}

export interface FileState {
  id: string;
  dataRoomId: string;
  folderId: string | null;
  name: ResourceName;
  path: MaterializedPath;
  content: FileContent;
  versionNumber: number;
}

/**
 * A logical document. The current version's content is held inline; superseded
 * versions live in FileVersion rows and keep their own blobs.
 */
export class DataRoomFile {
  private constructor(private state: FileState) {}

  static create(input: {
    id: string;
    dataRoomId: string;
    folder: { id: string; dataRoomId: string; path: MaterializedPath } | null;
    name: string;
    content: FileContent;
  }): DataRoomFile {
    if (input.folder && input.folder.dataRoomId !== input.dataRoomId) {
      throw new ValidationError('A file cannot be created outside its data room');
    }
    assertContent(input.content);

    return new DataRoomFile({
      id: input.id,
      dataRoomId: input.dataRoomId,
      folderId: input.folder?.id ?? null,
      name: ResourceName.create(input.name),
      path: input.folder ? input.folder.path : MaterializedPath.root(),
      content: input.content,
      versionNumber: 1,
    });
  }

  static rehydrate(state: {
    id: string;
    dataRoomId: string;
    folderId: string | null;
    name: string;
    path: string;
    sizeBytes: bigint;
    contentType: string;
    blobPathname: string;
    versionNumber: number;
  }): DataRoomFile {
    return new DataRoomFile({
      id: state.id,
      dataRoomId: state.dataRoomId,
      folderId: state.folderId,
      name: ResourceName.create(state.name),
      path: MaterializedPath.fromString(state.path),
      content: {
        sizeBytes: state.sizeBytes,
        contentType: state.contentType,
        blobPathname: state.blobPathname,
      },
      versionNumber: state.versionNumber,
    });
  }

  get id(): string {
    return this.state.id;
  }

  get dataRoomId(): string {
    return this.state.dataRoomId;
  }

  get folderId(): string | null {
    return this.state.folderId;
  }

  get name(): ResourceName {
    return this.state.name;
  }

  get path(): MaterializedPath {
    return this.state.path;
  }

  get content(): FileContent {
    return this.state.content;
  }

  get versionNumber(): number {
    return this.state.versionNumber;
  }

  rename(newName: string): void {
    this.state.name = ResourceName.create(newName);
  }

  moveTo(folder: { id: string; dataRoomId: string; path: MaterializedPath } | null): void {
    if (folder && folder.dataRoomId !== this.dataRoomId) {
      throw new ValidationError('A file cannot be moved to another data room');
    }
    this.state.folderId = folder?.id ?? null;
    this.state.path = folder ? folder.path : MaterializedPath.root();
  }

  /**
   * Supersede the current content. The previous version's blob is untouched, so
   * older revisions stay downloadable.
   */
  addVersion(content: FileContent): number {
    assertContent(content);
    this.state.content = content;
    this.state.versionNumber += 1;
    return this.state.versionNumber;
  }

  toSnapshot() {
    return {
      id: this.state.id,
      dataRoomId: this.state.dataRoomId,
      folderId: this.state.folderId,
      name: this.state.name.value,
      path: this.state.path.value,
      sizeBytes: this.state.content.sizeBytes,
      contentType: this.state.content.contentType,
      blobPathname: this.state.content.blobPathname,
      versionNumber: this.state.versionNumber,
    };
  }
}

function assertContent(content: FileContent): void {
  if (content.sizeBytes < 0n) {
    throw new ValidationError('File size cannot be negative');
  }
  if (!content.blobPathname.trim()) {
    throw new ValidationError('A file version must reference a stored blob');
  }
  if (!content.contentType.trim()) {
    throw new ValidationError('A file version must declare a content type');
  }
}
