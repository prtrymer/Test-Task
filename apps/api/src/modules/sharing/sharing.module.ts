import { Module, forwardRef } from '@nestjs/common';
import { DataRoomModule } from '../data-room/data-room.module';
import { IdentityModule } from '../identity/identity.module';
import { AccessResolver } from './application/access-resolver';
import { CreateShareHandler } from './application/commands/create-share.handler';
import { RevokeShareHandler } from './application/commands/revoke-share.handler';
import { ResolveShareLinkHandler } from './application/queries/resolve-share-link.handler';
import { ShareRepositoryPort } from './application/ports/share.repository';
import { PrismaShareRepository } from './infrastructure/prisma-share.repository';
import { SharesController } from './interface/http/shares.controller';

/**
 * Sharing and data-room reference each other: every data-room operation asks
 * AccessResolver for a decision, and creating a share has to resolve the
 * subject it points at. forwardRef keeps that mutual dependency explicit.
 */
@Module({
  imports: [forwardRef(() => DataRoomModule), IdentityModule],
  controllers: [SharesController],
  providers: [
    AccessResolver,
    CreateShareHandler,
    RevokeShareHandler,
    ResolveShareLinkHandler,
    { provide: ShareRepositoryPort, useClass: PrismaShareRepository },
  ],
  exports: [AccessResolver, ShareRepositoryPort],
})
export class SharingModule {}
