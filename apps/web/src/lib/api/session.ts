import type { User } from './types';

const TOKEN_KEY = 'dataroom.accessToken';
const USER_KEY = 'dataroom.user';

/**
 * The API is a separate origin issuing bearer tokens, so the token is held in
 * localStorage and sent as a header. That trades XSS exposure for simplicity;
 * an httpOnly cookie would need the API to share a parent domain and handle
 * CSRF, which is a bigger change than this MVP warrants.
 */
export const session = {
  getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem(TOKEN_KEY);
  },

  getUser(): User | null {
    if (typeof window === 'undefined') return null;
    const raw = window.localStorage.getItem(USER_KEY);
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
