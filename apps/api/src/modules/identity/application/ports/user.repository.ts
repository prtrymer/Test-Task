export type AuthProvider = 'LOCAL' | 'GOOGLE';

export interface UserRecord {
  id: string;
  email: string;
  name: string | null;
}

export interface IdentityRecord {
  userId: string;
  provider: AuthProvider;
  providerUserId: string;
  passwordHash: string | null;
}

export abstract class UserRepositoryPort {
  abstract findById(id: string): Promise<UserRecord | null>;
  abstract findByEmail(email: string): Promise<UserRecord | null>;

  abstract findIdentity(
    provider: AuthProvider,
    providerUserId: string,
  ): Promise<IdentityRecord | null>;

  abstract createWithIdentity(input: {
    id: string;
    email: string;
    name: string | null;
    provider: AuthProvider;
    providerUserId: string;
    passwordHash: string | null;
  }): Promise<UserRecord>;

  abstract addIdentity(input: {
    userId: string;
    provider: AuthProvider;
    providerUserId: string;
    passwordHash: string | null;
  }): Promise<void>;
}
