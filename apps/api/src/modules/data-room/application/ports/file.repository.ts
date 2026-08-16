import { DataRoomFile } from '../../domain/file';

export abstract class FileRepositoryPort {
  abstract findById(dataRoomId: string, id: string): Promise<DataRoomFile | null>;

  abstract findByName(
    dataRoomId: string,
    folderId: string | null,
    name: string,
  ): Promise<DataRoomFile | null>;

  abstract insert(file: DataRoomFile, uploadedById: string): Promise<void>;

  abstract update(file: DataRoomFile): Promise<void>;

  abstract appendVersion(file: DataRoomFile, uploadedById: string): Promise<void>;

  abstract delete(dataRoomId: string, id: string): Promise<void>;

  abstract listBlobPathnames(dataRoomId: string, fileId: string): Promise<string[]>;

  abstract listNamesStartingWith(
    dataRoomId: string,
    folderId: string | null,
    prefix: string,
  ): Promise<string[]>;
}
