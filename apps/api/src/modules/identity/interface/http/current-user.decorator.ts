import { ExecutionContext, createParamDecorator } from '@nestjs/common';
import { Request } from 'express';
import { Caller } from '../../../sharing/application/access-resolver';

export interface AuthenticatedRequest extends Request {
  caller?: Caller;
}

export const CurrentCaller = createParamDecorator(
  (_data: unknown, context: ExecutionContext): Caller => {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    return request.caller ?? { userId: null, linkToken: null };
  },
);
