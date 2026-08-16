import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { AuthenticateUserHandler } from './application/commands/authenticate-user.handler';
import { RegisterUserHandler } from './application/commands/register-user.handler';
import { PasswordHasherPort } from './application/ports/password-hasher.port';
import { TokenIssuerPort } from './application/ports/token-issuer.port';
import { UserRepositoryPort } from './application/ports/user.repository';
import { BcryptPasswordHasher } from './infrastructure/bcrypt-password-hasher';
import { JwtTokenIssuer } from './infrastructure/jwt-token-issuer';
import { PrismaUserRepository } from './infrastructure/prisma-user.repository';
import { AuthController } from './interface/http/auth.controller';
import { AuthenticatedGuard } from './interface/http/authenticated.guard';

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    RegisterUserHandler,
    AuthenticateUserHandler,
    AuthenticatedGuard,
    { provide: UserRepositoryPort, useClass: PrismaUserRepository },
    { provide: PasswordHasherPort, useClass: BcryptPasswordHasher },
    { provide: TokenIssuerPort, useClass: JwtTokenIssuer },
  ],
  exports: [UserRepositoryPort, TokenIssuerPort, AuthenticatedGuard],
})
export class IdentityModule {}
