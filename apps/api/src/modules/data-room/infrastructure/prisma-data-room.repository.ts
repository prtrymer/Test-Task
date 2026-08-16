import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service';
import {
  DataRoomRecord,
  DataRoomRepositoryPort,
} from '../application/ports/data-room.repository';

@Injectable()
export class PrismaDataRoomRepository extends DataRoomRepositoryPort {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findById(id: string): Promise<DataRoomRecord | null> {
    return this.prisma.dataRoom.findUnique({
      where: { id },
      select: { id: true, name: true, ownerId: true, createdAt: true },
    });
  }

  async listOwnedBy(ownerId: string): Promise<DataRoomRecord[]> {
    return this.prisma.dataRoom.findMany({
      where: { ownerId },
      select: { id: true, name: true, ownerId: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async insert(record: { id: string; name: string; ownerId: string }): Promise<void> {
    await this.prisma.dataRoom.create({ data: record });
  }

  async rename(id: string, name: string): Promise<void> {
    await this.prisma.dataRoom.update({ where: { id }, data: { name } });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.dataRoom.delete({ where: { id } });
  }

  async listBlobPathnames(id: string): Promise<string[]> {
    const rows = await this.prisma.fileVersion.findMany({
      where: { file: { dataRoomId: id } },
      select: { blobPathname: true },
    });
    return rows.map((row) => row.blobPathname);
  }
}
