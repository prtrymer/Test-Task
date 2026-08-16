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
