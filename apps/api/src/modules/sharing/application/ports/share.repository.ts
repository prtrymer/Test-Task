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

  /**
   * Every active grant this user holds in one room. FOLDER subjects come back
   * with their folder's path resolved, because coverage is a prefix test.
   */
  abstract findActiveForUser(userId: string, dataRoomId: string): Promise<Share[]>;

  /** Resolves a public link. Returns null when revoked, expired or unknown. */
  abstract findActiveByToken(token: string): Promise<Share | null>;

  /** The owner's "who can see this" panel. */
  abstract listForSubject(input: {
    dataRoomId: string;
    subjectFolderId?: string | null;
    subjectFileId?: string | null;
  }): Promise<Share[]>;

  /** Drives the recipient's "shared with me" list. */
  abstract listSharedWith(userId: string): Promise<SharedRoomSummary[]>;

  abstract insert(share: Share): Promise<void>;

  abstract update(share: Share): Promise<void>;
}
