import type { User } from './types';

const TOKEN_KEY = 'dataroom.accessToken';
const USER_KEY = 'dataroom.user';

export const session = {
  getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem(TOKEN_KEY);
  },

  getRawUser(): string | null {
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem(USER_KEY);
  },

  getUser(): User | null {
    const raw = session.getRawUser();
    if (!raw) return null;
    try {
      return JSON.parse(raw) as User;
    } catch {
      return null;
    }
  },

  start(token: string, user: User): void {
    window.localStorage.setItem(TOKEN_KEY, token);
    window.localStorage.setItem(USER_KEY, JSON.stringify(user));
    window.dispatchEvent(new Event(SESSION_CHANGED));
  },

  end(): void {
    window.localStorage.removeItem(TOKEN_KEY);
    window.localStorage.removeItem(USER_KEY);
    window.dispatchEvent(new Event(SESSION_CHANGED));
  },
};

export const SESSION_CHANGED = 'dataroom:session-changed';
