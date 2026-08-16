import { AccessTarget, Share } from './share';

export type AccessSource = 'OWNER' | 'SHARE';

export interface AccessDecision {
  canRead: boolean;
  canWrite: boolean;
  source: AccessSource | null;
  /** The share that granted read access, when it came from one. */
  grantedBy: Share | null;
}

const DENIED: AccessDecision = {
  canRead: false,
  canWrite: false,
  source: null,
  grantedBy: null,
};

/**
 * The single place that decides who may see what.
 *
 * Owners have full access to their own rooms. Everyone else is read-only, and
 * only where an active share covers the target. Keeping this pure means the
 * rules can be tested exhaustively without a database, and there is one place
 * to change when EDITOR is introduced.
 */
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
      // Read-only is the only role the product grants today. When EDITOR
      // arrives this becomes `covering.role === 'EDITOR'`.
      canWrite: false,
      source: 'SHARE',
      grantedBy: covering,
    };
  }

  /** Convenience for the common case of a read check that must not fail open. */
  static canRead(input: {
    userId: string | null;
    dataRoomOwnerId: string;
    target: AccessTarget;
    shares: readonly Share[];
    now: Date;
  }): boolean {
    return AccessPolicy.evaluate(input).canRead;
  }
}
