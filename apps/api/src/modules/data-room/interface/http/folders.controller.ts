import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { Caller } from '../../../sharing/application/access-resolver';
import { CurrentCaller } from '../../../identity/interface/http/current-user.decorator';
import { CreateFolderHandler } from '../../application/commands/create-folder.handler';
import { DeleteFolderHandler } from '../../application/commands/delete-folder.handler';
import { MoveFolderHandler } from '../../application/commands/move-folder.handler';
import { RenameFolderHandler } from '../../application/commands/rename-folder.handler';
import { CreateFolderDto, MoveFolderDto, RenameDto } from './dto';
import { presentFolder, presentStats } from './presenters';

@Controller('data-rooms/:dataRoomId/folders')
export class FoldersController {
  constructor(
    private readonly create_: CreateFolderHandler,
    private readonly rename_: RenameFolderHandler,
    private readonly move_: MoveFolderHandler,
    private readonly delete_: DeleteFolderHandler,
  ) {}

  @Post()
  async create(
    @CurrentCaller() caller: Caller,
    @Param('dataRoomId', ParseUUIDPipe) dataRoomId: string,
    @Body() body: CreateFolderDto,
  ) {
    const folder = await this.create_.execute(caller, {
      dataRoomId,
      parentId: body.parentId ?? null,
      name: body.name,
    });
    return presentFolder(folder);
  }

  @Patch(':folderId')
  async rename(
    @CurrentCaller() caller: Caller,
    @Param('dataRoomId', ParseUUIDPipe) dataRoomId: string,
    @Param('folderId', ParseUUIDPipe) folderId: string,
    @Body() body: RenameDto,
  ) {
    const folder = await this.rename_.execute(caller, {
      dataRoomId,
      folderId,
      name: body.name,
    });
    return presentFolder(folder);
  }

  @Post(':folderId/move')
  async move(
    @CurrentCaller() caller: Caller,
    @Param('dataRoomId', ParseUUIDPipe) dataRoomId: string,
    @Param('folderId', ParseUUIDPipe) folderId: string,
    @Body() body: MoveFolderDto,
  ) {
    const folder = await this.move_.execute(caller, {
      dataRoomId,
      folderId,
      newParentId: body.newParentId ?? null,
    });
    return presentFolder(folder);
  }

  @Get(':folderId/deletion-preview')
  async preview(
    @CurrentCaller() caller: Caller,
    @Param('dataRoomId', ParseUUIDPipe) dataRoomId: string,
    @Param('folderId', ParseUUIDPipe) folderId: string,
  ) {
    return presentStats(await this.delete_.preview(caller, { dataRoomId, folderId }));
  }

  @Delete(':folderId')
  @HttpCode(200)
  async remove(
    @CurrentCaller() caller: Caller,
    @Param('dataRoomId', ParseUUIDPipe) dataRoomId: string,
    @Param('folderId', ParseUUIDPipe) folderId: string,
  ) {
    const removed = await this.delete_.execute(caller, { dataRoomId, folderId });
    return { removed: presentStats(removed) };
  }
}
