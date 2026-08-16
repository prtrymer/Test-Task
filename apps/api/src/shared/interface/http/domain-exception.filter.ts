import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { DomainError } from '../../domain/domain-error';

const STATUS_BY_CODE: Record<string, HttpStatus> = {
  VALIDATION_ERROR: HttpStatus.BAD_REQUEST,
  UNAUTHORIZED: HttpStatus.UNAUTHORIZED,
  FORBIDDEN: HttpStatus.FORBIDDEN,
  NOT_FOUND: HttpStatus.NOT_FOUND,
  CONFLICT: HttpStatus.CONFLICT,
};

interface ErrorBody {
  error: { code: string; message: string };
}

/**
 * The one place errors become HTTP. Catching everything — not just DomainError
 * — means the client always receives the same envelope, so it never has to
 * guess at a response shape it did not expect. Keeping the mapping here is also
 * what lets the domain and application layers stay free of Nest imports.
 */
@Catch()
export class DomainExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(DomainExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const { status, body } = this.translate(exception);
    response.status(status).json(body);
  }

  private translate(exception: unknown): { status: HttpStatus; body: ErrorBody } {
    if (exception instanceof DomainError) {
      const status = STATUS_BY_CODE[exception.code] ?? HttpStatus.INTERNAL_SERVER_ERROR;
      if (status === HttpStatus.INTERNAL_SERVER_ERROR) {
        this.logger.error(`Unmapped domain error: ${exception.code}`, exception.stack);
      }
      return {
        status,
        body: { error: { code: exception.code, message: exception.message } },
      };
    }

    // Nest's own pipes and guards answer before the handler runs; their
    // messages are safe to pass through and are usually the most specific
    // thing the caller can be told.
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const payload = exception.getResponse();
      const message =
        typeof payload === 'string'
          ? payload
          : this.firstMessage(payload) ?? exception.message;
      return { status, body: { error: { code: codeForStatus(status), message } } };
    }

    // Anything else is a bug or an upstream failure. Log it in full; tell the
    // caller nothing about its internals.
    this.logger.error(
      `Unhandled ${exception instanceof Error ? exception.name : typeof exception}`,
      exception instanceof Error ? exception.stack : String(exception),
    );

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      body: {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Something went wrong on our side. Please try again.',
        },
      },
    };
  }

  /** ValidationPipe returns `{ message: string[] }`; surface the first entry. */
  private firstMessage(payload: object): string | undefined {
    const message = (payload as { message?: unknown }).message;
    if (Array.isArray(message)) return message[0] as string;
    if (typeof message === 'string') return message;
    return undefined;
  }
}

function codeForStatus(status: number): string {
  switch (status) {
    case HttpStatus.BAD_REQUEST:
      return 'VALIDATION_ERROR';
    case HttpStatus.UNAUTHORIZED:
      return 'UNAUTHORIZED';
    case HttpStatus.FORBIDDEN:
      return 'FORBIDDEN';
    case HttpStatus.NOT_FOUND:
      return 'NOT_FOUND';
    case HttpStatus.CONFLICT:
      return 'CONFLICT';
    default:
      return 'INTERNAL_ERROR';
  }
}
