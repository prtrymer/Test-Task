import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  AccessTokenClaims,
  AuthTokens,
  TokenIssuerPort,
} from '../application/ports/token-issuer.port';

@Injectable()
export class JwtTokenIssuer extends TokenIssuerPort {
  private readonly ttlSeconds: number;

  constructor(
    private readonly jwt: JwtService,
    config: ConfigService,
  ) {
    super();
    this.ttlSeconds = parseTtl(config.get<string>('JWT_EXPIRES_IN', '15m'));
  }

  async issue(claims: AccessTokenClaims): Promise<AuthTokens> {
    const accessToken = await this.jwt.signAsync(
      { sub: claims.userId, email: claims.email },
      { expiresIn: this.ttlSeconds },
    );
    return { accessToken, expiresInSeconds: this.ttlSeconds };
  }

  async verify(token: string): Promise<AccessTokenClaims | null> {
    try {
      const payload = await this.jwt.verifyAsync<{ sub: string; email: string }>(token);
      return { userId: payload.sub, email: payload.email };
    } catch {
      // Expired, tampered with, or signed by a different secret — all the same
      // to a caller: not authenticated.
      return null;
    }
  }
}

/** Accepts `900`, `15m`, `2h`, `7d`. */
function parseTtl(raw: string): number {
  const match = /^(\d+)([smhd])?$/.exec(raw.trim());
  if (!match) return 900;
  const amount = Number(match[1]);
  const multiplier = { s: 1, m: 60, h: 3600, d: 86400 }[match[2] ?? 's'] ?? 1;
  return amount * multiplier;
}
