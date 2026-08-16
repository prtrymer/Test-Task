import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Response } from 'express';
import { TokenIssuerPort } from '../../application/ports/token-issuer.port';
import { AuthenticatedRequest } from './current-user.decorator';

@Injectable()
export class CallerMiddleware implements NestMiddleware {
  constructor(private readonly tokens: TokenIssuerPort) {}

  async use(
    req: AuthenticatedRequest,
    _res: Response,
    next: NextFunction,
  ): Promise<void> {
    const bearer = req.headers.authorization?.replace(/^Bearer\s+/i, '');
    const claims = bearer ? await this.tokens.verify(bearer) : null;

    const header = req.headers['x-share-token'];
    const linkToken = typeof header === 'string' && header ? header : null;

    req.caller = { userId: claims?.userId ?? null, linkToken };
    next();
  }
}
