import { Injectable } from '@nestjs/common';
import { UnauthorizedError } from '../../../../shared/domain/domain-error';
import { PasswordHasherPort } from '../ports/password-hasher.port';
import { AuthTokens, TokenIssuerPort } from '../ports/token-issuer.port';
import { UserRecord, UserRepositoryPort } from '../ports/user.repository';

export interface AuthenticateUserCommand {
  email: string;
  password: string;
}

@Injectable()
export class AuthenticateUserHandler {
  constructor(
    private readonly users: UserRepositoryPort,
    private readonly hasher: PasswordHasherPort,
    private readonly tokens: TokenIssuerPort,
  ) {}

  async execute(
    command: AuthenticateUserCommand,
  ): Promise<{ user: UserRecord; tokens: AuthTokens }> {
    const email = command.email.trim().toLowerCase();
    const identity = await this.users.findIdentity('LOCAL', email);

    if (!identity?.passwordHash) {
      await this.hasher.verify(command.password, DUMMY_HASH);
      throw new UnauthorizedError('Email or password is incorrect');
    }

    const matches = await this.hasher.verify(command.password, identity.passwordHash);
    if (!matches) {
      throw new UnauthorizedError('Email or password is incorrect');
    }

    const user = await this.users.findById(identity.userId);
    if (!user) throw new UnauthorizedError('Email or password is incorrect');

    return { user, tokens: await this.tokens.issue({ userId: user.id, email }) };
  }
}

const DUMMY_HASH = '$2a$12$C6UzMDM.H6dfI/f/IKcEe.WQ8sYJ8VfBiVzZ0Zq5oZ5.6cKk8mJ5S';
