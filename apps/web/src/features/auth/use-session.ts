'use client';

import { useCallback, useMemo, useSyncExternalStore } from 'react';
import { SESSION_CHANGED, session } from '@/lib/api/session';
import type { User } from '@/lib/api/types';

function subscribe(onChange: () => void): () => void {
  window.addEventListener(SESSION_CHANGED, onChange);
  window.addEventListener('storage', onChange);
  return () => {
    window.removeEventListener(SESSION_CHANGED, onChange);
    window.removeEventListener('storage', onChange);
  };
}

export function useSession() {
  const raw = useSyncExternalStore(
    subscribe,
    () => session.getRawUser(),
    () => null,
  );

  const ready = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );

  const user = useMemo<User | null>(() => {
    if (!raw) return null;
    try {
      return JSON.parse(raw) as User;
    } catch {
      return null;
    }
  }, [raw]);

  const signOut = useCallback(() => session.end(), []);

  return { user, ready, isSignedIn: Boolean(user), signOut };
}
