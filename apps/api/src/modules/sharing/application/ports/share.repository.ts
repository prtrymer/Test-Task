import { Share } from '../../domain/share';

export interface SharedRoomSummary {
  dataRoomId: string;
  dataRoomName: string;
  ownerEmail: string;
  shareId: string;
  subjectType: 'DATA_ROOM' | 'FOLDER' | 'FILE';
  subjectFolderId: string | null;
  subjectFileId: string | null;
}

export abstract class ShareRepositoryPort {
  abstract findById(id: string): Promise<Share | null>;

  abstract findActiveForUser(userId: string, dataRoomId: string): Promise<Share[]>;

  abstract findActiveByToken(token: string): Promise<Share | null>;

  abstract listForSubject(input: {
    dataRoomId: string;
    subjectFolderId?: string | null;
    subjectFileId?: string | null;
  }): Promise<Share[]>;

  abstract listSharedWith(userId: string): Promise<SharedRoomSummary[]>;

  abstract insert(share: Share): Promise<void>;

  abstract update(share: Share): Promise<void>;
}
