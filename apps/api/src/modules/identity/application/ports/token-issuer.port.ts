export interface AuthTokens {
  accessToken: string;
  expiresInSeconds: number;
}

export interface AccessTokenClaims {
  userId: string;
  email: string;
}

export abstract class TokenIssuerPort {
  abstract issue(claims: AccessTokenClaims): Promise<AuthTokens>;
  abstract verify(token: string): Promise<AccessTokenClaims | null>;
}
