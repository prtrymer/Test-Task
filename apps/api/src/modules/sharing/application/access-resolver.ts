import { Injectable } from '@nestjs/common';
import { ForbiddenError, NotFoundError } from '../../../shared/domain/domain-error';
import { ClockPort } from '../../../shared/application/ports/clock.port';
import { DataRoomRepositoryPort } from '../../data-room/application/ports/data-room.repository';
import { AccessDecision, AccessPolicy } from '../domain/access-policy';
import { AccessTarget, Share } from '../domain/share';
import { ShareRepositoryPort } from './ports/share.repository';

export interface Caller {
  userId: string | null;
  /** Present when the request arrived through a public share link. */
  linkToken?: string | null;
}

/**
 * Turns a caller and a target into a decision, by loading whatever grants
 * apply and handing them to AccessPolicy. Every read and write path goes
 * through here, so there is one answer to "may they?" rather than one per
 * controller.
 */
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

  /**
   * Denies with "not found" rather than "forbidden": telling an unauthorised
   * caller that an id exists is itself a disclosure, and lets them enumerate.
   */
  async requireRead(caller: Caller, target: AccessTarget): Promise<AccessDecision> {
    const decision = await this.evaluate(caller, target);
    if (!decision.canRead) throw new NotFoundError('Not found');
    return decision;
  }

  /** Writes are the owner's alone today, so a failure here is a true 403. */
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
      // A token for another room is simply not a grant here.
      if (linkShare && linkShare.dataRoomId === dataRoomId) {
        grants.push(linkShare);
      }
    }

    return grants;
  }
}
