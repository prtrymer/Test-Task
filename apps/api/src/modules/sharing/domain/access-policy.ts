import { AccessTarget, Share } from './share';

export type AccessSource = 'OWNER' | 'SHARE';

export interface AccessDecision {
  canRead: boolean;
  canWrite: boolean;
  source: AccessSource | null;

  grantedBy: Share | null;
}

const DENIED: AccessDecision = {
  canRead: false,
  canWrite: false,
  source: null,
  grantedBy: null,
};

export class AccessPolicy {
  static evaluate(input: {
    userId: string | null;
    dataRoomOwnerId: string;
    target: AccessTarget;
    shares: readonly Share[];
    now: Date;
  }): AccessDecision {
    const { userId, dataRoomOwnerId, target, shares, now } = input;

    if (userId && userId === dataRoomOwnerId) {
      return { canRead: true, canWrite: true, source: 'OWNER', grantedBy: null };
    }

    const covering = shares.find((share) => share.covers(target, now));
    if (!covering) return DENIED;

    return {
      canRead: true,

      canWrite: false,
      source: 'SHARE',
      grantedBy: covering,
    };
  }
}
