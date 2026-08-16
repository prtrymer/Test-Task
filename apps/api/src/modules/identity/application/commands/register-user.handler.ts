import { Injectable } from '@nestjs/common';
import { ConflictError, ValidationError } from '../../../../shared/domain/domain-error';
import { IdGeneratorPort } from '../../../../shared/application/ports/id-generator.port';
import { isUniqueViolation } from '../../../../shared/application/unique-violation';
import { PasswordHasherPort } from '../ports/password-hasher.port';
import { AuthTokens, TokenIssuerPort } from '../ports/token-issuer.port';
import { UserRecord, UserRepositoryPort } from '../ports/user.repository';

export interface RegisterUserCommand {
  email: string;
  password: string;
  name?: string | null;
}

export const MIN_PASSWORD_LENGTH = 10;

@Injectable()
export class RegisterUserHandler {
  constructor(
    private readonly users: UserRepositoryPort,
    private readonly hasher: PasswordHasherPort,
    private readonly tokens: TokenIssuerPort,
    private readonly ids: IdGeneratorPort,
  ) {}

  async execute(
    command: RegisterUserCommand,
  ): Promise<{ user: UserRecord; tokens: AuthTokens }> {
    const email = command.email.trim().toLowerCase();

    if (command.password.length < MIN_PASSWORD_LENGTH) {
      throw new ValidationError(
        `Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
      );
    }

    const passwordHash = await this.hasher.hash(command.password);

    let user: UserRecord;
    try {
      user = await this.users.createWithIdentity({
        id: this.ids.generate(),
        email,
        name: command.name?.trim() || null,
        provider: 'LOCAL',
        providerUserId: email,
        passwordHash,
      });
    } catch (error) {
      // The unique index on email decides this, not a prior read — two
      // simultaneous registrations cannot both succeed.
      if (isUniqueViolation(error)) {
        throw new ConflictError('An account with that email already exists');
      }
      throw error;
    }

    return { user, tokens: await this.tokens.issue({ userId: user.id, email }) };
  }
}
