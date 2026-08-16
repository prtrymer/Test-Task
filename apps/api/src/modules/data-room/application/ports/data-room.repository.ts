export interface DataRoomRecord {
  id: string;
  name: string;
  ownerId: string;
  createdAt: Date;
}

export abstract class DataRoomRepositoryPort {
  abstract findById(id: string): Promise<DataRoomRecord | null>;
  abstract listOwnedBy(ownerId: string): Promise<DataRoomRecord[]>;
  abstract insert(record: { id: string; name: string; ownerId: string }): Promise<void>;
  abstract rename(id: string, name: string): Promise<void>;
  abstract delete(id: string): Promise<void>;
  /** Every blob in the room, for cleanup after deletion. */
  abstract listBlobPathnames(id: string): Promise<string[]>;
}
