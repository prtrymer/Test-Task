import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Response } from 'express';
import { TokenIssuerPort } from '../../application/ports/token-issuer.port';
import { AuthenticatedRequest } from './current-user.decorator';

/**
 * Resolves who is asking, without deciding whether they may. An invalid or
 * absent token yields an anonymous caller rather than a rejection — public
 * share links have to reach the handlers to be evaluated.
 */
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

    // Header rather than query string. The token is the only thing protecting a
    // public link's contents, and query strings leak into access logs, browser
    // history and Referer headers. The token lives in the frontend's own URL;
    // it reaches the API as a credential.
    const header = req.headers['x-share-token'];
    const linkToken = typeof header === 'string' && header ? header : null;

    req.caller = { userId: claims?.userId ?? null, linkToken };
    next();
  }
}
