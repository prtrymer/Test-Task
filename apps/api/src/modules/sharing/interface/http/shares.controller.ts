import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsDate, IsEmail, IsIn, IsOptional, IsUUID } from 'class-validator';
import { AuthenticatedGuard } from '../../../identity/interface/http/authenticated.guard';
import { CurrentCaller } from '../../../identity/interface/http/current-user.decorator';
import { Caller } from '../../application/access-resolver';
import { CreateShareHandler } from '../../application/commands/create-share.handler';
import { RevokeShareHandler } from '../../application/commands/revoke-share.handler';
import { ResolveShareLinkHandler } from '../../application/queries/resolve-share-link.handler';
import { ShareRepositoryPort } from '../../application/ports/share.repository';
import { Share } from '../../domain/share';

export class CreateShareDto {
  @IsIn(['DATA_ROOM', 'FOLDER', 'FILE'])
  subjectType!: 'DATA_ROOM' | 'FOLDER' | 'FILE';

  @IsOptional()
  @IsUUID()
  subjectFolderId?: string;

  @IsOptional()
  @IsUUID()
  subjectFileId?: string;

  @IsIn(['PUBLIC_LINK', 'RESTRICTED'])
  mode!: 'PUBLIC_LINK' | 'RESTRICTED';

  @IsOptional()
  @IsEmail()
  granteeEmail?: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  expiresAt?: Date;
}

const present = (share: Share) => ({
  id: share.id,
  subjectType: share.subject.type,
  mode: share.mode,
  role: share.role,
  granteeUserId: share.granteeUserId,

  token: share.token,
  expiresAt: share.expiresAt?.toISOString() ?? null,
  revokedAt: share.revokedAt?.toISOString() ?? null,
});

@Controller()
export class SharesController {
  constructor(
    private readonly create_: CreateShareHandler,
    private readonly revoke_: RevokeShareHandler,
    private readonly resolveLink: ResolveShareLinkHandler,
    private readonly shares: ShareRepositoryPort,
  ) {}

  @Get('share-links/resolve')
  async resolve(@CurrentCaller() caller: Caller) {
    return this.resolveLink.execute(caller.linkToken ?? null);
  }

  @Post('data-rooms/:dataRoomId/shares')
  @UseGuards(AuthenticatedGuard)
  async create(
    @CurrentCaller() caller: Caller,
    @Param('dataRoomId', ParseUUIDPipe) dataRoomId: string,
    @Body() body: CreateShareDto,
  ) {
    const share = await this.create_.execute(caller, {
      dataRoomId,
      subjectType: body.subjectType,
      subjectFolderId: body.subjectFolderId ?? null,
      subjectFileId: body.subjectFileId ?? null,
      mode: body.mode,
      granteeEmail: body.granteeEmail ?? null,
      expiresAt: body.expiresAt ?? null,
    });
    return present(share);
  }

  @Get('data-rooms/:dataRoomId/shares')
  @UseGuards(AuthenticatedGuard)
  async list(
    @Param('dataRoomId', ParseUUIDPipe) dataRoomId: string,
    @Query('folderId') folderId?: string,
    @Query('fileId') fileId?: string,
  ) {
    const shares = await this.shares.listForSubject({
      dataRoomId,
      subjectFolderId: folderId ?? null,
      subjectFileId: fileId ?? null,
    });
    return { items: shares.map(present) };
  }

  @Delete('shares/:shareId')
  @HttpCode(204)
  @UseGuards(AuthenticatedGuard)
  async revoke(
    @CurrentCaller() caller: Caller,
    @Param('shareId', ParseUUIDPipe) shareId: string,
  ): Promise<void> {
    await this.revoke_.execute(caller, shareId);
  }

  @Get('shared-with-me')
  @UseGuards(AuthenticatedGuard)
  async sharedWithMe(@CurrentCaller() caller: Caller) {
    return { items: await this.shares.listSharedWith(caller.userId as string) };
  }
}
