import { Injectable } from '@nestjs/common';
import { NotFoundError } from '../../../../shared/domain/domain-error';
import { ClockPort } from '../../../../shared/application/ports/clock.port';
import { DataRoomRepositoryPort } from '../../../data-room/application/ports/data-room.repository';
import { ShareRepositoryPort } from '../ports/share.repository';

export interface ResolvedShareLink {
  dataRoomId: string;
  dataRoomName: string;
  subjectType: 'DATA_ROOM' | 'FOLDER' | 'FILE';
  subjectFolderId: string | null;
  subjectFileId: string | null;
}

/**
 * Turns a public link token into the thing it opens, so an anonymous visitor
 * knows what to render before making any scoped request.
 *
 * This is the only endpoint that accepts a bare token with no session, so it
 * returns the minimum needed to bootstrap the view — never the owner's identity
 * or anything outside the shared subject.
 */
@Injectable()
export class ResolveShareLinkHandler {
  constructor(
    private readonly shares: ShareRepositoryPort,
    private readonly dataRooms: DataRoomRepositoryPort,
    private readonly clock: ClockPort,
  ) {}

  async execute(token: string | null): Promise<ResolvedShareLink> {
    if (!token) throw new NotFoundError('This link is not valid');

    const share = await this.shares.findActiveByToken(token);
    // Expiry is the domain's call; the repository only filters revocation.
    if (!share || !share.isActive(this.clock.now())) {
      throw new NotFoundError('This link is no longer valid');
    }

    const room = await this.dataRooms.findById(share.dataRoomId);
    if (!room) throw new NotFoundError('This link is no longer valid');

    const subject = share.subject;

    return {
      dataRoomId: room.id,
      dataRoomName: room.name,
      subjectType: subject.type,
      subjectFolderId: subject.type === 'FOLDER' ? subject.folderId : null,
      subjectFileId: subject.type === 'FILE' ? subject.fileId : null,
    };
  }
}
