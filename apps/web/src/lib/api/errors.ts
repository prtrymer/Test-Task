export type ApiErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'NETWORK'
  | 'UNKNOWN';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: ApiErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  /**
   * The API answers 404 for anything the caller may not see, so a disappeared
   * item and a revoked share are indistinguishable here by design — both mean
   * "this is no longer yours to view".
   */
  get isGone(): boolean {
    return this.status === 404;
  }

  get isAuthFailure(): boolean {
    return this.status === 401;
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}
