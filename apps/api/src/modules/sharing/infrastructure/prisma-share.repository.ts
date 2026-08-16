import { Injectable } from '@nestjs/common';
import { MaterializedPath } from '../../../shared/domain/materialized-path';
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service';
import { Share, ShareSubject } from '../domain/share';
import {
  ShareRepositoryPort,
  SharedRoomSummary,
} from '../application/ports/share.repository';

/** Shape returned by every query here: the row plus its folder's path. */
type ShareRow = {
  id: string;
  dataRoomId: string;
  subjectType: 'DATA_ROOM' | 'FOLDER' | 'FILE';
  subjectFolderId: string | null;
  subjectFileId: string | null;
  mode: 'PUBLIC_LINK' | 'RESTRICTED';
  role: 'VIEWER';
  granteeUserId: string | null;
  token: string | null;
  createdById: string;
  expiresAt: Date | null;
  revokedAt: Date | null;
  subjectFolder: { path: string } | null;
};

const WITH_FOLDER_PATH = { subjectFolder: { select: { path: true } } } as const;

@Injectable()
export class PrismaShareRepository extends ShareRepositoryPort {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findById(id: string): Promise<Share | null> {
    const row = await this.prisma.share.findUnique({
      where: { id },
      include: WITH_FOLDER_PATH,
    });
    return row ? toDomain(row) : null;
  }

  /**
   * Revoked grants are filtered here because the partial index makes that
   * cheap. Expiry is left to the domain, so there is one authority on whether
   * a share is live.
   */
  async findActiveForUser(userId: string, dataRoomId: string): Promise<Share[]> {
    const rows = await this.prisma.share.findMany({
      where: { granteeUserId: userId, dataRoomId, revokedAt: null },
      include: WITH_FOLDER_PATH,
    });
    return rows.map(toDomain);
  }

  async findActiveByToken(token: string): Promise<Share | null> {
    const row = await this.prisma.share.findFirst({
      where: { token, mode: 'PUBLIC_LINK', revokedAt: null },
      include: WITH_FOLDER_PATH,
    });
    return row ? toDomain(row) : null;
  }

  async listForSubject(input: {
    dataRoomId: string;
    subjectFolderId?: string | null;
    subjectFileId?: string | null;
  }): Promise<Share[]> {
    const rows = await this.prisma.share.findMany({
      where: {
        dataRoomId: input.dataRoomId,
        subjectFolderId: input.subjectFolderId ?? null,
        subjectFileId: input.subjectFileId ?? null,
        revokedAt: null,
      },
      include: WITH_FOLDER_PATH,
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(toDomain);
  }

  async listSharedWith(userId: string): Promise<SharedRoomSummary[]> {
    const rows = await this.prisma.share.findMany({
      where: { granteeUserId: userId, revokedAt: null },
      select: {
        id: true,
        subjectType: true,
        subjectFolderId: true,
        subjectFileId: true,
        dataRoom: { select: { id: true, name: true, owner: { select: { email: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return rows.map((row) => ({
      shareId: row.id,
      dataRoomId: row.dataRoom.id,
      dataRoomName: row.dataRoom.name,
      ownerEmail: row.dataRoom.owner.email,
      subjectType: row.subjectType,
      subjectFolderId: row.subjectFolderId,
      subjectFileId: row.subjectFileId,
    }));
  }

  async insert(share: Share): Promise<void> {
    await this.prisma.share.create({ data: share.toSnapshot() });
  }

  async update(share: Share): Promise<void> {
    const { id, ...rest } = share.toSnapshot();
    await this.prisma.share.update({ where: { id }, data: rest });
  }
}

function toDomain(row: ShareRow): Share {
  return Share.rehydrate({
    id: row.id,
    dataRoomId: row.dataRoomId,
    subject: toSubject(row),
    mode: row.mode,
    role: row.role,
    granteeUserId: row.granteeUserId,
    token: row.token,
    createdById: row.createdById,
    expiresAt: row.expiresAt,
    revokedAt: row.revokedAt,
  });
}

function toSubject(row: ShareRow): ShareSubject {
  switch (row.subjectType) {
    case 'FOLDER':
      // The CHECK constraint guarantees the id; the join guarantees the path.
      return {
        type: 'FOLDER',
        folderId: row.subjectFolderId as string,
        path: MaterializedPath.fromString(row.subjectFolder?.path ?? '/'),
      };
    case 'FILE':
      return { type: 'FILE', fileId: row.subjectFileId as string };
    default:
      return { type: 'DATA_ROOM' };
  }
}
