import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { UnauthorizedError } from '../../../../shared/domain/domain-error';
import { AuthenticatedRequest } from './current-user.decorator';

/** For routes that make no sense anonymously, such as creating a data room. */
@Injectable()
export class AuthenticatedGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!request.caller?.userId) {
      throw new UnauthorizedError('Sign in to continue');
    }
    return true;
  }
}
