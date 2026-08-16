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
  Query,
  UseGuards,
} from '@nestjs/common';
import { Caller } from '../../../sharing/application/access-resolver';
import { AuthenticatedGuard } from '../../../identity/interface/http/authenticated.guard';
import { CurrentCaller } from '../../../identity/interface/http/current-user.decorator';
import { ManageDataRoomHandler } from '../../application/commands/manage-data-room.handler';
import { BrowseHandler } from '../../application/queries/browse.handler';
import {
  CreateDataRoomDto,
  ListDirectoryQueryDto,
  RenameDto,
  SearchQueryDto,
} from './dto';
import { presentEntry, presentStats } from './presenters';

@Controller('data-rooms')
export class DataRoomsController {
  constructor(
    private readonly rooms: ManageDataRoomHandler,
    private readonly browse: BrowseHandler,
  ) {}

  @Post()
  @UseGuards(AuthenticatedGuard)
  async create(@CurrentCaller() caller: Caller, @Body() body: CreateDataRoomDto) {
    const room = await this.rooms.create(caller, body.name);
    return { id: room.id, name: room.name, createdAt: room.createdAt.toISOString() };
  }

  @Get()
  @UseGuards(AuthenticatedGuard)
  async list(@CurrentCaller() caller: Caller) {
    const rooms = await this.rooms.listOwned(caller);
    return {
      items: rooms.map((room) => ({
        id: room.id,
        name: room.name,
        createdAt: room.createdAt.toISOString(),
      })),
    };
  }

  @Get(':id')
  async get(@CurrentCaller() caller: Caller, @Param('id', ParseUUIDPipe) id: string) {
    const room = await this.rooms.get(caller, id);
    return { id: room.id, name: room.name, createdAt: room.createdAt.toISOString() };
  }

  @Patch(':id')
  @HttpCode(204)
  async rename(
    @CurrentCaller() caller: Caller,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: RenameDto,
  ): Promise<void> {
    await this.rooms.rename(caller, id, body.name);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(
    @CurrentCaller() caller: Caller,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.rooms.remove(caller, id);
  }

  /** Contents of the room root, or of `folderId` when given. */
  @Get(':id/entries')
  async entries(
    @CurrentCaller() caller: Caller,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: ListDirectoryQueryDto,
  ) {
    const page = await this.browse.listDirectory(caller, {
      dataRoomId: id,
      folderId: query.folderId ?? null,
      cursor: query.cursor ?? null,
      limit: query.limit,
      sort: query.sort,
    });
    return { items: page.items.map(presentEntry), nextCursor: page.nextCursor };
  }

  @Get(':id/search')
  async search(
    @CurrentCaller() caller: Caller,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: SearchQueryDto,
  ) {
    const page = await this.browse.search(caller, {
      dataRoomId: id,
      term: query.q,
      cursor: query.cursor ?? null,
      limit: query.limit,
      withinFolderId: query.folderId ?? null,
    });
    return { items: page.items.map(presentEntry), nextCursor: page.nextCursor };
  }

  @Get(':id/folders/:folderId/stats')
  async stats(
    @CurrentCaller() caller: Caller,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('folderId', ParseUUIDPipe) folderId: string,
  ) {
    return presentStats(await this.browse.folderStats(caller, id, folderId));
  }

  @Get(':id/folders/:folderId/breadcrumbs')
  async breadcrumbs(
    @CurrentCaller() caller: Caller,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('folderId', ParseUUIDPipe) folderId: string,
  ) {
    return { items: await this.browse.breadcrumbs(caller, id, folderId) };
  }
}
