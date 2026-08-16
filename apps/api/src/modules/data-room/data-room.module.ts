import { Module, forwardRef } from '@nestjs/common';
import { SharingModule } from '../sharing/sharing.module';
import { StorageModule } from '../storage/storage.module';
import { IdentityModule } from '../identity/identity.module';
import { CommitUploadHandler } from './application/commands/commit-upload.handler';
import { CreateFolderHandler } from './application/commands/create-folder.handler';
import { DeleteFolderHandler } from './application/commands/delete-folder.handler';
import { ManageDataRoomHandler } from './application/commands/manage-data-room.handler';
import { ManageFileHandler } from './application/commands/manage-file.handler';
import { MoveFolderHandler } from './application/commands/move-folder.handler';
import { RenameFolderHandler } from './application/commands/rename-folder.handler';
import { RequestUploadHandler } from './application/commands/request-upload.handler';
import { BrowseHandler } from './application/queries/browse.handler';
import { GetFileUrlHandler } from './application/queries/get-file-url.handler';
import { DataRoomQueriesPort } from './application/ports/data-room.queries';
import { DataRoomRepositoryPort } from './application/ports/data-room.repository';
import { FileRepositoryPort } from './application/ports/file.repository';
import { FolderRepositoryPort } from './application/ports/folder.repository';
import { PrismaDataRoomQueries } from './infrastructure/prisma-data-room.queries';
import { PrismaDataRoomRepository } from './infrastructure/prisma-data-room.repository';
import { PrismaFileRepository } from './infrastructure/prisma-file.repository';
import { PrismaFolderRepository } from './infrastructure/prisma-folder.repository';
import { DataRoomsController } from './interface/http/data-rooms.controller';
import { FilesController } from './interface/http/files.controller';
import { FoldersController } from './interface/http/folders.controller';

@Module({
  imports: [forwardRef(() => SharingModule), StorageModule, IdentityModule],
  controllers: [DataRoomsController, FoldersController, FilesController],
  providers: [
    ManageDataRoomHandler,
    CreateFolderHandler,
    RenameFolderHandler,
    MoveFolderHandler,
    DeleteFolderHandler,
    RequestUploadHandler,
    CommitUploadHandler,
    ManageFileHandler,
    GetFileUrlHandler,
    BrowseHandler,
    { provide: DataRoomRepositoryPort, useClass: PrismaDataRoomRepository },
    { provide: FolderRepositoryPort, useClass: PrismaFolderRepository },
    { provide: FileRepositoryPort, useClass: PrismaFileRepository },
    { provide: DataRoomQueriesPort, useClass: PrismaDataRoomQueries },
  ],
  exports: [DataRoomRepositoryPort, FolderRepositoryPort, FileRepositoryPort],
})
export class DataRoomModule {}
