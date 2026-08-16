import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateDataRoomDto {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name!: string;
}

export class RenameDto {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name!: string;
}

export class CreateFolderDto {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name!: string;

  @IsOptional()
  @IsUUID()
  parentId?: string | null;
}

export class MoveFolderDto {
  @IsOptional()
  @IsUUID()
  newParentId?: string | null;
}

export class MoveFileDto {
  @IsOptional()
  @IsUUID()
  folderId?: string | null;
}

export class RequestUploadDto {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name!: string;

  @IsString()
  contentType!: string;

  @IsOptional()
  @IsUUID()
  folderId?: string | null;
}

export class CommitUploadDto {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name!: string;

  @IsString()
  @MinLength(1)
  blobPathname!: string;

  @IsOptional()
  @IsUUID()
  folderId?: string | null;
}

export class ListDirectoryQueryDto {
  @IsOptional()
  @IsUUID()
  folderId?: string;

  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @IsIn(['name', 'updatedAt'])
  sort?: 'name' | 'updatedAt';
}

export class SearchQueryDto {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  q!: string;

  @IsOptional()
  @IsUUID()
  folderId?: string;

  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
