import { Injectable } from '@nestjs/common';
import { MaterializedPath } from '../../../shared/domain/materialized-path';
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service';
import { Folder } from '../domain/folder';
import { FolderRepositoryPort } from '../application/ports/folder.repository';

@Injectable()
export class PrismaFolderRepository extends FolderRepositoryPort {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findById(dataRoomId: string, id: string): Promise<Folder | null> {
    const row = await this.prisma.folder.findFirst({ where: { id, dataRoomId } });
    return row ? Folder.rehydrate(row) : null;
  }

  async insert(folder: Folder): Promise<void> {
    await this.prisma.folder.create({ data: folder.toSnapshot() });
  }

  async update(folder: Folder): Promise<void> {
    const { id, ...rest } = folder.toSnapshot();
    await this.prisma.folder.update({ where: { id }, data: rest });
  }

  async delete(dataRoomId: string, id: string): Promise<void> {
    await this.prisma.folder.deleteMany({ where: { id, dataRoomId } });
  }

  async applyMove(input: {
    folder: Folder;
    from: MaterializedPath;
    to: MaterializedPath;
  }): Promise<void> {
    const { folder, from, to } = input;
    const snapshot = folder.toSnapshot();
    const oldPrefix = from.value;
    const newPrefix = to.value;
    const pattern = from.toSubtreePattern();
    const dataRoomId = snapshot.dataRoomId;

    await this.prisma.$transaction([
      this.prisma.folder.update({
        where: { id: snapshot.id },
        data: {
          parentId: snapshot.parentId,
          path: snapshot.path,
          depth: snapshot.depth,
          name: snapshot.name,
        },
      }),

      this.prisma.$executeRaw`
        UPDATE "folders"
        SET "path" = ${newPrefix} || substring("path" from ${oldPrefix.length + 1}),
            "depth" = "depth" + ${to.depth - from.depth}
        WHERE "dataRoomId" = ${dataRoomId}::uuid
          AND "path" LIKE ${pattern}
          AND "id" <> ${snapshot.id}::uuid
      `,

      this.prisma.$executeRaw`
        UPDATE "files"
        SET "path" = ${newPrefix} || substring("path" from ${oldPrefix.length + 1})
        WHERE "dataRoomId" = ${dataRoomId}::uuid
          AND "path" LIKE ${pattern}
      `,
    ]);
  }

  async listBlobPathnamesUnder(
    dataRoomId: string,
    path: MaterializedPath,
  ): Promise<string[]> {
    const rows = await this.prisma.$queryRaw<{ blobPathname: string }[]>`
      SELECT v."blobPathname"
      FROM "file_versions" v
      JOIN "files" f ON f."id" = v."fileId"
      WHERE f."dataRoomId" = ${dataRoomId}::uuid
        AND f."path" LIKE ${path.toSubtreePattern()}
    `;
    return rows.map((row) => row.blobPathname);
  }
}
