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
import { CommitUploadHandler } from '../../application/commands/commit-upload.handler';
import { ManageFileHandler } from '../../application/commands/manage-file.handler';
import { RequestUploadHandler } from '../../application/commands/request-upload.handler';
import { GetFileUrlHandler } from '../../application/queries/get-file-url.handler';
import { CommitUploadDto, MoveFileDto, RenameDto, RequestUploadDto } from './dto';
import { asBytes, presentFile } from './presenters';

@Controller('data-rooms/:dataRoomId/files')
export class FilesController {
  constructor(
    private readonly requestUpload: RequestUploadHandler,
    private readonly commitUpload: CommitUploadHandler,
    private readonly manage: ManageFileHandler,
    private readonly fileUrl: GetFileUrlHandler,
  ) {}

  /**
   * Step one of an upload. Returns a presigned URL the browser PUTs to
   * directly — the bytes never pass through this API.
   */
  @Post('upload-ticket')
  async ticket(
    @CurrentCaller() caller: Caller,
    @Param('dataRoomId', ParseUUIDPipe) dataRoomId: string,
    @Body() body: RequestUploadDto,
  ) {
    const ticket = await this.requestUpload.execute(caller, {
      dataRoomId,
      folderId: body.folderId ?? null,
      name: body.name,
      contentType: body.contentType,
    });
    return {
      uploadUrl: ticket.uploadUrl,
      pathname: ticket.pathname,
      expiresAt: ticket.expiresAt.toISOString(),
    };
  }

  /** Step two: the upload landed, so the file becomes visible. */
  @Post()
  async commit(
    @CurrentCaller() caller: Caller,
    @Param('dataRoomId', ParseUUIDPipe) dataRoomId: string,
    @Body() body: CommitUploadDto,
  ) {
    const { file, versioned } = await this.commitUpload.execute(caller, {
      dataRoomId,
      folderId: body.folderId ?? null,
      name: body.name,
      blobPathname: body.blobPathname,
    });
    return { ...presentFile(file), versioned };
  }

  /** Short-lived URL for viewing. See GetFileUrlHandler on why it is short. */
  @Get(':fileId/url')
  async url(
    @CurrentCaller() caller: Caller,
    @Param('dataRoomId', ParseUUIDPipe) dataRoomId: string,
    @Param('fileId', ParseUUIDPipe) fileId: string,
  ) {
    const result = await this.fileUrl.execute(caller, { dataRoomId, fileId });
    return {
      url: result.url,
      expiresInSeconds: result.expiresInSeconds,
      name: result.name,
      contentType: result.contentType,
      sizeBytes: asBytes(result.sizeBytes),
    };
  }

  @Patch(':fileId')
  async rename(
    @CurrentCaller() caller: Caller,
    @Param('dataRoomId', ParseUUIDPipe) dataRoomId: string,
    @Param('fileId', ParseUUIDPipe) fileId: string,
    @Body() body: RenameDto,
  ) {
    return presentFile(
      await this.manage.rename(caller, { dataRoomId, fileId, name: body.name }),
    );
  }

  @Post(':fileId/move')
  async move(
    @CurrentCaller() caller: Caller,
    @Param('dataRoomId', ParseUUIDPipe) dataRoomId: string,
    @Param('fileId', ParseUUIDPipe) fileId: string,
    @Body() body: MoveFileDto,
  ) {
    return presentFile(
      await this.manage.move(caller, { dataRoomId, fileId, folderId: body.folderId ?? null }),
    );
  }

  @Delete(':fileId')
  @HttpCode(204)
  async remove(
    @CurrentCaller() caller: Caller,
    @Param('dataRoomId', ParseUUIDPipe) dataRoomId: string,
    @Param('fileId', ParseUUIDPipe) fileId: string,
  ): Promise<void> {
    await this.manage.remove(caller, { dataRoomId, fileId });
  }
}
