import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service';
import {
  Breadcrumb,
  DataRoomQueriesPort,
  DirectoryEntry,
  DirectorySort,
  FileEntry,
  Page,
  SubtreeStats,
} from '../application/ports/data-room.queries';

/** Keyset position. Folders sort before files, hence the group ordinal. */
interface Cursor {
  g: number;
  k: string;
  i: string;
}

function encodeCursor(cursor: Cursor): string {
  return Buffer.from(JSON.stringify(cursor)).toString('base64url');
}

function decodeCursor(raw: string | null): Cursor | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(Buffer.from(raw, 'base64url').toString());
    if (typeof parsed?.g !== 'number' || typeof parsed?.k !== 'string') return null;
    return { g: parsed.g, k: parsed.k, i: String(parsed.i ?? '') };
  } catch {
    // A malformed cursor restarts the listing rather than failing the request.
    return null;
  }
}

interface DirectoryRow {
  sort_group: number;
  kind: 'folder' | 'file';
  id: string;
  name: string;
  updatedAt: Date;
  sizeBytes: bigint | null;
  contentType: string | null;
  versionNumber: number | null;
  sort_key: string;
}

@Injectable()
export class PrismaDataRoomQueries extends DataRoomQueriesPort {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async listDirectory(input: {
    dataRoomId: string;
    folderId: string | null;
    cursor: string | null;
    limit: number;
    sort: DirectorySort;
  }): Promise<Page<DirectoryEntry>> {
    const { dataRoomId, folderId, limit, sort } = input;
    const cursor = decodeCursor(input.cursor);

    // The sort key is materialised into the union so one comparison serves
    // both branches, whichever column the caller ordered by.
    const sortKey =
      sort === 'updatedAt'
        ? Prisma.sql`to_char("updatedAt" AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS')`
        : Prisma.sql`"name"`;

    const folderMatch = folderId ? Prisma.sql`= ${folderId}::uuid` : Prisma.sql`IS NULL`;

    // Fetch one extra row to learn whether another page exists.
    const take = limit + 1;

    const rows = await this.prisma.$queryRaw<DirectoryRow[]>`
      WITH entries AS (
        SELECT 0 AS sort_group, 'folder' AS kind, "id", "name", "updatedAt",
               NULL::bigint AS "sizeBytes", NULL::text AS "contentType",
               NULL::int AS "versionNumber", ${sortKey} AS sort_key
        FROM "folders"
        WHERE "dataRoomId" = ${dataRoomId}::uuid AND "parentId" ${folderMatch}
        UNION ALL
        SELECT 1 AS sort_group, 'file' AS kind, "id", "name", "updatedAt",
               "sizeBytes", "contentType", "versionNumber", ${sortKey} AS sort_key
        FROM "files"
        WHERE "dataRoomId" = ${dataRoomId}::uuid AND "folderId" ${folderMatch}
      )
      SELECT * FROM entries
      WHERE ${
        cursor
          ? Prisma.sql`(sort_group, sort_key, "id") > (${cursor.g}, ${cursor.k}, ${cursor.i}::uuid)`
          : Prisma.sql`TRUE`
      }
      ORDER BY sort_group, sort_key, "id"
      LIMIT ${take}
    `;

    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    const last = page.at(-1);

    return {
      items: page.map(toDirectoryEntry),
      nextCursor:
        hasMore && last
          ? encodeCursor({ g: last.sort_group, k: last.sort_key, i: last.id })
          : null,
    };
  }

  async breadcrumbs(dataRoomId: string, folderId: string): Promise<Breadcrumb[]> {
    const folder = await this.prisma.folder.findFirst({
      where: { id: folderId, dataRoomId },
      select: { path: true },
    });
    if (!folder) return [];

    const ancestorIds = folder.path.split('/').filter(Boolean);
    if (!ancestorIds.length) return [];

    const rows = await this.prisma.folder.findMany({
      where: { dataRoomId, id: { in: ancestorIds } },
      select: { id: true, name: true },
    });

    // Restore the path's order, which `IN` does not preserve.
    const byId = new Map(rows.map((row) => [row.id, row.name]));
    return ancestorIds
      .filter((id) => byId.has(id))
      .map((id) => ({ id, name: byId.get(id) as string }));
  }

  async subtreeStats(dataRoomId: string, path: string): Promise<SubtreeStats> {
    const pattern = `${path}%`;

    const [row] = await this.prisma.$queryRaw<
      { folder_count: number; file_count: number; total_size: bigint }[]
    >`
      SELECT
        (SELECT COUNT(*)::int FROM "folders"
          WHERE "dataRoomId" = ${dataRoomId}::uuid
            AND "path" LIKE ${pattern}
            AND "path" <> ${path}) AS folder_count,
        (SELECT COUNT(*)::int FROM "files"
          WHERE "dataRoomId" = ${dataRoomId}::uuid
            AND "path" LIKE ${pattern}) AS file_count,
        (SELECT COALESCE(SUM("sizeBytes"), 0)::bigint FROM "files"
          WHERE "dataRoomId" = ${dataRoomId}::uuid
            AND "path" LIKE ${pattern}) AS total_size
    `;

    return {
      folderCount: row?.folder_count ?? 0,
      fileCount: row?.file_count ?? 0,
      totalSizeBytes: BigInt(row?.total_size ?? 0),
    };
  }

  async searchFiles(input: {
    dataRoomId: string;
    term: string;
    cursor: string | null;
    limit: number;
    withinPath?: string;
  }): Promise<Page<FileEntry>> {
    const { dataRoomId, limit } = input;
    const term = input.term.trim();
    if (!term) return { items: [], nextCursor: null };

    const cursor = decodeCursor(input.cursor);
    const take = limit + 1;

    // ILIKE '%term%' is served by the trigram GIN index on files.name.
    const rows = await this.prisma.$queryRaw<DirectoryRow[]>`
      SELECT 1 AS sort_group, 'file' AS kind, "id", "name", "updatedAt",
             "sizeBytes", "contentType", "versionNumber", "name" AS sort_key
      FROM "files"
      WHERE "dataRoomId" = ${dataRoomId}::uuid
        AND "name" ILIKE ${'%' + term + '%'}
        AND ${
          input.withinPath
            ? Prisma.sql`"path" LIKE ${input.withinPath + '%'}`
            : Prisma.sql`TRUE`
        }
        AND ${
          cursor
            ? Prisma.sql`("name", "id") > (${cursor.k}, ${cursor.i}::uuid)`
            : Prisma.sql`TRUE`
        }
      ORDER BY "name", "id"
      LIMIT ${take}
    `;

    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    const last = page.at(-1);

    return {
      items: page.map((row) => toDirectoryEntry(row) as FileEntry),
      nextCursor:
        hasMore && last ? encodeCursor({ g: 1, k: last.sort_key, i: last.id }) : null,
    };
  }
}

function toDirectoryEntry(row: DirectoryRow): DirectoryEntry {
  if (row.kind === 'folder') {
    return { kind: 'folder', id: row.id, name: row.name, updatedAt: row.updatedAt };
  }
  return {
    kind: 'file',
    id: row.id,
    name: row.name,
    updatedAt: row.updatedAt,
    sizeBytes: row.sizeBytes ?? 0n,
    contentType: row.contentType ?? 'application/octet-stream',
    versionNumber: row.versionNumber ?? 1,
  };
}
