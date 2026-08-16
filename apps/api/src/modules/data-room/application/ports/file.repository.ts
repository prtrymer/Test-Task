import { DataRoomFile } from '../../domain/file';

export abstract class FileRepositoryPort {
  abstract findById(dataRoomId: string, id: string): Promise<DataRoomFile | null>;

  /** Drives conflict resolution on upload: same name in the same folder. */
  abstract findByName(
    dataRoomId: string,
    folderId: string | null,
    name: string,
  ): Promise<DataRoomFile | null>;

  abstract insert(file: DataRoomFile, uploadedById: string): Promise<void>;

  abstract update(file: DataRoomFile): Promise<void>;

  /** Persists the new current content and appends the version row atomically. */
  abstract appendVersion(file: DataRoomFile, uploadedById: string): Promise<void>;

  abstract delete(dataRoomId: string, id: string): Promise<void>;

  abstract listBlobPathnames(dataRoomId: string, fileId: string): Promise<string[]>;
}
