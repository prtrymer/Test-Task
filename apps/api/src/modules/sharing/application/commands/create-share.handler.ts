import { Injectable } from '@nestjs/common';
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from '../../../../shared/domain/domain-error';
import { IdGeneratorPort } from '../../../../shared/application/ports/id-generator.port';
import { isUniqueViolation } from '../../../../shared/application/unique-violation';
import { FileRepositoryPort } from '../../../data-room/application/ports/file.repository';
import { FolderRepositoryPort } from '../../../data-room/application/ports/folder.repository';
import { UserRepositoryPort } from '../../../identity/application/ports/user.repository';
import { Share, ShareSubject } from '../../domain/share';
import { AccessResolver, Caller } from '../access-resolver';
import { ShareRepositoryPort } from '../ports/share.repository';

export interface CreateShareCommand {
  dataRoomId: string;
  subjectType: 'DATA_ROOM' | 'FOLDER' | 'FILE';
  subjectFolderId?: string | null;
  subjectFileId?: string | null;
  mode: 'PUBLIC_LINK' | 'RESTRICTED';

  granteeEmail?: string | null;
  expiresAt?: Date | null;
}

@Injectable()
export class CreateShareHandler {
  constructor(
    private readonly shares: ShareRepositoryPort,
    private readonly folders: FolderRepositoryPort,
    private readonly files: FileRepositoryPort,
    private readonly users: UserRepositoryPort,
    private readonly access: AccessResolver,
    private readonly ids: IdGeneratorPort,
  ) {}

  async execute(caller: Caller, command: CreateShareCommand): Promise<Share> {
    if (!caller.userId) throw new ValidationError('Sharing requires a signed-in user');

    await this.access.requireWrite(caller, {
      kind: 'DATA_ROOM',
      dataRoomId: command.dataRoomId,
    });

    const subject = await this.resolveSubject(command);

    if (command.mode === 'PUBLIC_LINK') {
      const share = Share.createPublicLink({
        id: this.ids.generate(),
        dataRoomId: command.dataRoomId,
        subject,
        token: this.ids.generateToken(),
        createdById: caller.userId,
        expiresAt: command.expiresAt,
      });
      await this.shares.insert(share);
      return share;
    }

    if (!command.granteeEmail) {
      throw new ValidationError('A restricted share needs a recipient');
    }

    const grantee = await this.users.findByEmail(
      command.granteeEmail.trim().toLowerCase(),
    );
    if (!grantee) {
      throw new NotFoundError(`No account exists for ${command.granteeEmail}`);
    }

    const share = Share.createRestricted({
      id: this.ids.generate(),
      dataRoomId: command.dataRoomId,
      subject,
      granteeUserId: grantee.id,
      createdById: caller.userId,
      expiresAt: command.expiresAt,
    });

    try {
      await this.shares.insert(share);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictError('That person already has access to this item');
      }
      throw error;
    }

    return share;
  }

  private async resolveSubject(command: CreateShareCommand): Promise<ShareSubject> {
    switch (command.subjectType) {
      case 'DATA_ROOM':
        return { type: 'DATA_ROOM' };

      case 'FOLDER': {
        if (!command.subjectFolderId) throw new ValidationError('No folder specified');
        const folder = await this.folders.findById(
          command.dataRoomId,
          command.subjectFolderId,
        );
        if (!folder) throw new NotFoundError('Folder not found');
        return { type: 'FOLDER', folderId: folder.id, path: folder.path };
      }

      case 'FILE': {
        if (!command.subjectFileId) throw new ValidationError('No file specified');
        const file = await this.files.findById(command.dataRoomId, command.subjectFileId);
        if (!file) throw new NotFoundError('File not found');
        return { type: 'FILE', fileId: file.id };
      }
    }
  }
}
