import { ExecutionContext, createParamDecorator } from '@nestjs/common';
import { Request } from 'express';
import { Caller } from '../../../sharing/application/access-resolver';

export interface AuthenticatedRequest extends Request {
  caller?: Caller;
}

/**
 * The caller as the application layer understands it: a user id when signed in,
 * plus a share-link token when the request arrived through a public link.
 * Anonymous link holders are legitimate callers, so this never throws.
 */
export const CurrentCaller = createParamDecorator(
  (_data: unknown, context: ExecutionContext): Caller => {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    return request.caller ?? { userId: null, linkToken: null };
  },
);
