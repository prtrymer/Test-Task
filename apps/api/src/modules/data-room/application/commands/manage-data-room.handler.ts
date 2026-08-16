import { Injectable, Logger } from '@nestjs/common';
import { NotFoundError, ValidationError } from '../../../../shared/domain/domain-error';
import { IdGeneratorPort } from '../../../../shared/application/ports/id-generator.port';
import { ResourceName } from '../../../../shared/domain/resource-name';
import { AccessResolver, Caller } from '../../../sharing/application/access-resolver';
import { StoragePort } from '../../../storage/application/ports/storage.port';
import {
  DataRoomRecord,
  DataRoomRepositoryPort,
} from '../ports/data-room.repository';

@Injectable()
export class ManageDataRoomHandler {
  private readonly logger = new Logger(ManageDataRoomHandler.name);

  constructor(
    private readonly rooms: DataRoomRepositoryPort,
    private readonly storage: StoragePort,
    private readonly access: AccessResolver,
    private readonly ids: IdGeneratorPort,
  ) {}

  async create(caller: Caller, name: string): Promise<DataRoomRecord> {
    if (!caller.userId) throw new ValidationError('Sign in to create a data room');

    const id = this.ids.generate();
    await this.rooms.insert({
      id,
      name: ResourceName.create(name).value,
      ownerId: caller.userId,
    });

    const created = await this.rooms.findById(id);
    if (!created) throw new NotFoundError('Data room not found');
    return created;
  }

  async listOwned(caller: Caller): Promise<DataRoomRecord[]> {
    if (!caller.userId) return [];
    return this.rooms.listOwnedBy(caller.userId);
  }

  async get(caller: Caller, dataRoomId: string): Promise<DataRoomRecord> {
    const room = await this.rooms.findById(dataRoomId);
    if (!room) throw new NotFoundError('Data room not found');
    await this.access.requireRead(caller, { kind: 'DATA_ROOM', dataRoomId });
    return room;
  }

  async rename(caller: Caller, dataRoomId: string, name: string): Promise<void> {
    await this.access.requireWrite(caller, { kind: 'DATA_ROOM', dataRoomId });
    await this.rooms.rename(dataRoomId, ResourceName.create(name).value);
  }

  async remove(caller: Caller, dataRoomId: string): Promise<void> {
    await this.access.requireWrite(caller, { kind: 'DATA_ROOM', dataRoomId });

    const blobs = await this.rooms.listBlobPathnames(dataRoomId);
    await this.rooms.delete(dataRoomId);

    if (blobs.length) {
      try {
        await this.storage.delete(blobs);
      } catch (error) {
        this.logger.error(
          `Deleted data room ${dataRoomId} but left ${blobs.length} blob(s) behind`,
          error instanceof Error ? error.stack : undefined,
        );
      }
    }
  }
}
