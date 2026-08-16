/**
 * Domain errors carry meaning, not HTTP status codes. The interface layer
 * translates them (see DomainExceptionFilter) so the domain never imports Nest.
 */
export abstract class DomainError extends Error {
  abstract readonly code: string;

  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

/** Input violates a rule the domain enforces. */
export class ValidationError extends DomainError {
  readonly code = 'VALIDATION_ERROR';
}

/** The referenced thing does not exist, or the caller may not know that it does. */
export class NotFoundError extends DomainError {
  readonly code = 'NOT_FOUND';
}

/** The operation conflicts with existing state, e.g. a duplicate name. */
export class ConflictError extends DomainError {
  readonly code = 'CONFLICT';
}

/** The caller is known but not allowed to do this. */
export class ForbiddenError extends DomainError {
  readonly code = 'FORBIDDEN';
}

/** The caller is not authenticated, or its credentials are wrong. */
export class UnauthorizedError extends DomainError {
  readonly code = 'UNAUTHORIZED';
}
