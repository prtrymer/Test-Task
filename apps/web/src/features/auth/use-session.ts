'use client';

import { useCallback, useMemo, useSyncExternalStore } from 'react';
import { SESSION_CHANGED, session } from '@/lib/api/session';
import type { User } from '@/lib/api/types';

/**
 * localStorage is an external store, so it is read through
 * useSyncExternalStore rather than mirrored into state inside an effect.
 * That keeps sign-in and sign-out in sync across tabs without an extra render
 * pass, and avoids a hydration mismatch on the server.
 */
function subscribe(onChange: () => void): () => void {
  window.addEventListener(SESSION_CHANGED, onChange);
  window.addEventListener('storage', onChange);
  return () => {
    window.removeEventListener(SESSION_CHANGED, onChange);
    window.removeEventListener('storage', onChange);
  };
}

export function useSession() {
  // The raw string is the snapshot: it is referentially stable between reads,
  // whereas a parsed object would be a new reference every time and loop.
  const raw = useSyncExternalStore(
    subscribe,
    () => session.getRawUser(),
    () => null,
  );

  // False during server rendering and the first client render, so callers can
  // avoid flashing the signed-out state before localStorage has been read.
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
