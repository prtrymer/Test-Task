import { Injectable } from '@nestjs/common';
import { NotFoundError } from '../../../../shared/domain/domain-error';
import { ClockPort } from '../../../../shared/application/ports/clock.port';
import { AccessResolver, Caller } from '../access-resolver';
import { ShareRepositoryPort } from '../ports/share.repository';

@Injectable()
export class RevokeShareHandler {
  constructor(
    private readonly shares: ShareRepositoryPort,
    private readonly access: AccessResolver,
    private readonly clock: ClockPort,
  ) {}

  async execute(caller: Caller, shareId: string): Promise<void> {
    const share = await this.shares.findById(shareId);
    if (!share) throw new NotFoundError('Share not found');

    await this.access.requireWrite(caller, {
      kind: 'DATA_ROOM',
      dataRoomId: share.dataRoomId,
    });

    share.revoke(this.clock.now());
    await this.shares.update(share);
  }
}
