import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service';
import { DataRoomFile } from '../domain/file';
import { FileRepositoryPort } from '../application/ports/file.repository';

@Injectable()
export class PrismaFileRepository extends FileRepositoryPort {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findById(dataRoomId: string, id: string): Promise<DataRoomFile | null> {
    const row = await this.prisma.file.findFirst({ where: { id, dataRoomId } });
    return row ? DataRoomFile.rehydrate(row) : null;
  }

  async findByName(
    dataRoomId: string,
    folderId: string | null,
    name: string,
  ): Promise<DataRoomFile | null> {
    const row = await this.prisma.file.findFirst({
      where: { dataRoomId, folderId, name },
    });
    return row ? DataRoomFile.rehydrate(row) : null;
  }

  async insert(file: DataRoomFile, uploadedById: string): Promise<void> {
    const snapshot = file.toSnapshot();
    await this.prisma.$transaction([
      this.prisma.file.create({ data: snapshot }),
      this.prisma.fileVersion.create({
        data: {
          fileId: snapshot.id,
          versionNumber: snapshot.versionNumber,
          sizeBytes: snapshot.sizeBytes,
          contentType: snapshot.contentType,
          blobPathname: snapshot.blobPathname,
          uploadedById,
        },
      }),
    ]);
  }

  async update(file: DataRoomFile): Promise<void> {
    const { id, ...rest } = file.toSnapshot();
    await this.prisma.file.update({ where: { id }, data: rest });
  }

  /**
   * The new current content and its history row are written together — a
   * version that exists in one and not the other would misreport the file.
   */
  async appendVersion(file: DataRoomFile, uploadedById: string): Promise<void> {
    const snapshot = file.toSnapshot();
    await this.prisma.$transaction([
      this.prisma.file.update({
        where: { id: snapshot.id },
        data: {
          sizeBytes: snapshot.sizeBytes,
          contentType: snapshot.contentType,
          blobPathname: snapshot.blobPathname,
          versionNumber: snapshot.versionNumber,
        },
      }),
      this.prisma.fileVersion.create({
        data: {
          fileId: snapshot.id,
          versionNumber: snapshot.versionNumber,
          sizeBytes: snapshot.sizeBytes,
          contentType: snapshot.contentType,
          blobPathname: snapshot.blobPathname,
          uploadedById,
        },
      }),
    ]);
  }

  async delete(dataRoomId: string, id: string): Promise<void> {
    await this.prisma.file.deleteMany({ where: { id, dataRoomId } });
  }

  async listBlobPathnames(dataRoomId: string, fileId: string): Promise<string[]> {
    const rows = await this.prisma.fileVersion.findMany({
      where: { fileId, file: { dataRoomId } },
      select: { blobPathname: true },
    });
    return rows.map((row) => row.blobPathname);
  }
}
