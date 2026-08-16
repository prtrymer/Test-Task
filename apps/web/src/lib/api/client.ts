import { ApiError, type ApiErrorCode } from './errors';
import { session } from './session';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

interface RequestOptions {
  body?: unknown;

  shareToken?: string | null;
  signal?: AbortSignal;
}

async function request<T>(
  method: string,
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const token = session.getToken();

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: {
        ...(options.body ? { 'content-type': 'application/json' } : {}),
        ...(token ? { authorization: `Bearer ${token}` } : {}),
        ...(options.shareToken ? { 'x-share-token': options.shareToken } : {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: options.signal,
    });
  } catch {
    throw new ApiError(0, 'NETWORK', 'Could not reach the server');
  }

  if (response.status === 204) return undefined as T;

  const text = await response.text();
  const payload = text ? safeParse(text) : null;

  if (!response.ok) {
    throw new ApiError(
      response.status,
      (payload?.error?.code as ApiErrorCode) ?? 'UNKNOWN',
      payload?.error?.message ?? messageForStatus(response.status),
      payload?.error?.details,
    );
  }

  return payload as T;
}

function safeParse(text: string): {
  error?: { code?: string; message?: string; details?: Record<string, unknown> };
} | null {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function messageForStatus(status: number): string {
  if (status === 400) return 'That request was not valid';
  if (status === 401) return 'Please sign in again';
  if (status === 404) return 'Not found';
  return 'Something went wrong';
}

export const api = {
  get: <T>(path: string, options?: RequestOptions) => request<T>('GET', path, options),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>('POST', path, { ...options, body }),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>('PATCH', path, { ...options, body }),
  delete: <T>(path: string, options?: RequestOptions) =>
    request<T>('DELETE', path, options),
};
