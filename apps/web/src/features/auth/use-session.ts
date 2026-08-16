'use client';

import { useCallback, useEffect, useState } from 'react';
import { SESSION_CHANGED, session } from '@/lib/api/session';
import type { User } from '@/lib/api/types';

interface SessionState {
  user: User | null;
  /** False until the first client-side read, so SSR and hydration agree. */
  ready: boolean;
}

/**
 * Reads the stored session and stays in sync with sign-in and sign-out, both
 * in this tab (custom event) and in others (storage event).
 */
export function useSession() {
  const [state, setState] = useState<SessionState>({ user: null, ready: false });

  const sync = useCallback(() => {
    setState({ user: session.getUser(), ready: true });
  }, []);

  useEffect(() => {
    sync();
    window.addEventListener(SESSION_CHANGED, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(SESSION_CHANGED, sync);
      window.removeEventListener('storage', sync);
    };
  }, [sync]);

  const signOut = useCallback(() => {
    session.end();
  }, []);

  return {
    user: state.user,
    ready: state.ready,
    isSignedIn: Boolean(state.user),
    signOut,
  };
}
