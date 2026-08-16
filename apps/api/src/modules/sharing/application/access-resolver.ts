import { Injectable } from '@nestjs/common';
import { ForbiddenError, NotFoundError } from '../../../shared/domain/domain-error';
import { ClockPort } from '../../../shared/application/ports/clock.port';
import { DataRoomRepositoryPort } from '../../data-room/application/ports/data-room.repository';
import { AccessDecision, AccessPolicy } from '../domain/access-policy';
import { AccessTarget, Share } from '../domain/share';
import { ShareRepositoryPort } from './ports/share.repository';

export interface Caller {
  userId: string | null;

  linkToken?: string | null;
}

@Injectable()
export class AccessResolver {
  constructor(
    private readonly dataRooms: DataRoomRepositoryPort,
    private readonly shares: ShareRepositoryPort,
    private readonly clock: ClockPort,
  ) {}

  async evaluate(caller: Caller, target: AccessTarget): Promise<AccessDecision> {
    const room = await this.dataRooms.findById(target.dataRoomId);
    if (!room) throw new NotFoundError('Data room not found');

    const grants = await this.collectGrants(caller, target.dataRoomId);

    return AccessPolicy.evaluate({
      userId: caller.userId,
      dataRoomOwnerId: room.ownerId,
      target,
      shares: grants,
      now: this.clock.now(),
    });
  }

  async requireRead(caller: Caller, target: AccessTarget): Promise<AccessDecision> {
    const decision = await this.evaluate(caller, target);
    if (!decision.canRead) throw new NotFoundError('Not found');
    return decision;
  }

  async requireWrite(caller: Caller, target: AccessTarget): Promise<AccessDecision> {
    const decision = await this.evaluate(caller, target);
    if (!decision.canRead) throw new NotFoundError('Not found');
    if (!decision.canWrite) {
      throw new ForbiddenError('This item was shared with you as read-only');
    }
    return decision;
  }

  private async collectGrants(caller: Caller, dataRoomId: string): Promise<Share[]> {
    const grants: Share[] = [];

    if (caller.userId) {
      grants.push(...(await this.shares.findActiveForUser(caller.userId, dataRoomId)));
    }

    if (caller.linkToken) {
      const linkShare = await this.shares.findActiveByToken(caller.linkToken);

      if (linkShare && linkShare.dataRoomId === dataRoomId) {
        grants.push(linkShare);
      }
    }

    return grants;
  }
}
