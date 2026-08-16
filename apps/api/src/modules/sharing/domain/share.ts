import { ConflictError, ValidationError } from '../../../shared/domain/domain-error';
import { MaterializedPath } from '../../../shared/domain/materialized-path';

export type ShareMode = 'PUBLIC_LINK' | 'RESTRICTED';
export type ShareRole = 'VIEWER';

export type ShareSubject =
  | { type: 'DATA_ROOM' }
  | { type: 'FOLDER'; folderId: string; path: MaterializedPath }
  | { type: 'FILE'; fileId: string };

export type AccessTarget =
  | { kind: 'DATA_ROOM'; dataRoomId: string }
  | { kind: 'FOLDER'; dataRoomId: string; folderId: string; path: MaterializedPath }
  | { kind: 'FILE'; dataRoomId: string; fileId: string; path: MaterializedPath };

interface ShareState {
  id: string;
  dataRoomId: string;
  subject: ShareSubject;
  mode: ShareMode;
  role: ShareRole;
  granteeUserId: string | null;
  token: string | null;
  createdById: string;
  expiresAt: Date | null;
  revokedAt: Date | null;
}

export class Share {
  private constructor(private state: ShareState) {}

  static createRestricted(input: {
    id: string;
    dataRoomId: string;
    subject: ShareSubject;
    granteeUserId: string;
    createdById: string;
    expiresAt?: Date | null;
  }): Share {
    if (input.granteeUserId === input.createdById) {
      throw new ConflictError('You already have access to this item');
    }
    return new Share({
      id: input.id,
      dataRoomId: input.dataRoomId,
      subject: input.subject,
      mode: 'RESTRICTED',
      role: 'VIEWER',
      granteeUserId: input.granteeUserId,
      token: null,
      createdById: input.createdById,
      expiresAt: input.expiresAt ?? null,
      revokedAt: null,
    });
  }

  static createPublicLink(input: {
    id: string;
    dataRoomId: string;
    subject: ShareSubject;
    token: string;
    createdById: string;
    expiresAt?: Date | null;
  }): Share {
    if (!input.token || input.token.length < 32) {
      throw new ValidationError('A public link token must be unguessable');
    }
    return new Share({
      id: input.id,
      dataRoomId: input.dataRoomId,
      subject: input.subject,
      mode: 'PUBLIC_LINK',
      role: 'VIEWER',
      granteeUserId: null,
      token: input.token,
      createdById: input.createdById,
      expiresAt: input.expiresAt ?? null,
      revokedAt: null,
    });
  }

  static rehydrate(state: ShareState): Share {
    return new Share(state);
  }

  get id(): string {
    return this.state.id;
  }

  get dataRoomId(): string {
    return this.state.dataRoomId;
  }

  get subject(): ShareSubject {
    return this.state.subject;
  }

  get mode(): ShareMode {
    return this.state.mode;
  }

  get role(): ShareRole {
    return this.state.role;
  }

  get granteeUserId(): string | null {
    return this.state.granteeUserId;
  }

  get token(): string | null {
    return this.state.token;
  }

  get createdById(): string {
    return this.state.createdById;
  }

  get expiresAt(): Date | null {
    return this.state.expiresAt;
  }

  get revokedAt(): Date | null {
    return this.state.revokedAt;
  }

  isActive(now: Date): boolean {
    if (this.state.revokedAt) return false;
    if (this.state.expiresAt && this.state.expiresAt <= now) return false;
    return true;
  }

  revoke(now: Date): void {
    if (this.state.revokedAt) {
      throw new ConflictError('This share has already been revoked');
    }
    this.state.revokedAt = now;
  }

  covers(target: AccessTarget, now: Date): boolean {
    if (!this.isActive(now)) return false;
    if (target.dataRoomId !== this.state.dataRoomId) return false;

    const subject = this.state.subject;

    switch (subject.type) {
      case 'DATA_ROOM':
        return true;

      case 'FOLDER':
        if (target.kind === 'DATA_ROOM') return false;
        return subject.path.contains(target.path);

      case 'FILE':
        return target.kind === 'FILE' && target.fileId === subject.fileId;
    }
  }

  toSnapshot() {
    const subject = this.state.subject;
    return {
      id: this.state.id,
      dataRoomId: this.state.dataRoomId,
      subjectType: subject.type,
      subjectFolderId: subject.type === 'FOLDER' ? subject.folderId : null,
      subjectFileId: subject.type === 'FILE' ? subject.fileId : null,
      mode: this.state.mode,
      role: this.state.role,
      granteeUserId: this.state.granteeUserId,
      token: this.state.token,
      createdById: this.state.createdById,
      expiresAt: this.state.expiresAt,
      revokedAt: this.state.revokedAt,
    };
  }
}
