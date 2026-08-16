import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service';
import {
  AuthProvider,
  IdentityRecord,
  UserRecord,
  UserRepositoryPort,
} from '../application/ports/user.repository';

const USER_FIELDS = { id: true, email: true, name: true } as const;

@Injectable()
export class PrismaUserRepository extends UserRepositoryPort {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findById(id: string): Promise<UserRecord | null> {
    return this.prisma.user.findUnique({ where: { id }, select: USER_FIELDS });
  }

  async findByEmail(email: string): Promise<UserRecord | null> {
    return this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: USER_FIELDS,
    });
  }

  async findIdentity(
    provider: AuthProvider,
    providerUserId: string,
  ): Promise<IdentityRecord | null> {
    const row = await this.prisma.authIdentity.findUnique({
      where: { provider_providerUserId: { provider, providerUserId } },
      select: {
        userId: true,
        provider: true,
        providerUserId: true,
        passwordHash: true,
      },
    });
    return row;
  }

  async createWithIdentity(input: {
    id: string;
    email: string;
    name: string | null;
    provider: AuthProvider;
    providerUserId: string;
    passwordHash: string | null;
  }): Promise<UserRecord> {
    return this.prisma.user.create({
      data: {
        id: input.id,
        email: input.email.toLowerCase(),
        name: input.name,
        identities: {
          create: {
            provider: input.provider,
            providerUserId: input.providerUserId,
            passwordHash: input.passwordHash,
          },
        },
      },
      select: USER_FIELDS,
    });
  }

  async addIdentity(input: {
    userId: string;
    provider: AuthProvider;
    providerUserId: string;
    passwordHash: string | null;
  }): Promise<void> {
    await this.prisma.authIdentity.create({ data: input });
  }
}
