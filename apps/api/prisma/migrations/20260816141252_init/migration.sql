-- Trigram matching, required by the GIN index on files.name further down.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- CreateEnum
CREATE TYPE "AuthProvider" AS ENUM ('LOCAL', 'GOOGLE');

-- CreateEnum
CREATE TYPE "ShareSubjectType" AS ENUM ('DATA_ROOM', 'FOLDER', 'FILE');

-- CreateEnum
CREATE TYPE "ShareMode" AS ENUM ('PUBLIC_LINK', 'RESTRICTED');

-- CreateEnum
CREATE TYPE "ShareRole" AS ENUM ('VIEWER');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_identities" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "provider" "AuthProvider" NOT NULL,
    "providerUserId" TEXT NOT NULL,
    "passwordHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auth_identities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "data_rooms" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "ownerId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "data_rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "folders" (
    "id" UUID NOT NULL,
    "dataRoomId" UUID NOT NULL,
    "parentId" UUID,
    "name" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "depth" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "folders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "files" (
    "id" UUID NOT NULL,
    "dataRoomId" UUID NOT NULL,
    "folderId" UUID,
    "name" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "sizeBytes" BIGINT NOT NULL,
    "contentType" TEXT NOT NULL,
    "blobPathname" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "file_versions" (
    "id" UUID NOT NULL,
    "fileId" UUID NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "sizeBytes" BIGINT NOT NULL,
    "contentType" TEXT NOT NULL,
    "blobPathname" TEXT NOT NULL,
    "uploadedById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "file_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shares" (
    "id" UUID NOT NULL,
    "dataRoomId" UUID NOT NULL,
    "subjectType" "ShareSubjectType" NOT NULL,
    "subjectFolderId" UUID,
    "subjectFileId" UUID,
    "mode" "ShareMode" NOT NULL,
    "role" "ShareRole" NOT NULL DEFAULT 'VIEWER',
    "granteeUserId" UUID,
    "token" TEXT,
    "createdById" UUID NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shares_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "auth_identities_userId_idx" ON "auth_identities"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "auth_identities_provider_providerUserId_key" ON "auth_identities"("provider", "providerUserId");

-- CreateIndex
CREATE INDEX "data_rooms_ownerId_createdAt_idx" ON "data_rooms"("ownerId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "folders_dataRoomId_parentId_name_idx" ON "folders"("dataRoomId", "parentId", "name");

-- CreateIndex
CREATE INDEX "folders_dataRoomId_path_idx" ON "folders"("dataRoomId", "path" text_pattern_ops);

-- CreateIndex
CREATE UNIQUE INDEX "folders_parentId_name_key" ON "folders"("parentId", "name");

-- CreateIndex
CREATE INDEX "files_dataRoomId_folderId_name_idx" ON "files"("dataRoomId", "folderId", "name");

-- CreateIndex
CREATE INDEX "files_dataRoomId_path_idx" ON "files"("dataRoomId", "path" text_pattern_ops);

-- CreateIndex
CREATE INDEX "files_dataRoomId_updatedAt_idx" ON "files"("dataRoomId", "updatedAt" DESC);

-- CreateIndex
CREATE INDEX "files_name_idx" ON "files" USING GIN ("name" gin_trgm_ops);

-- CreateIndex
CREATE UNIQUE INDEX "files_folderId_name_key" ON "files"("folderId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "file_versions_blobPathname_key" ON "file_versions"("blobPathname");

-- CreateIndex
CREATE INDEX "file_versions_fileId_createdAt_idx" ON "file_versions"("fileId", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "file_versions_fileId_versionNumber_key" ON "file_versions"("fileId", "versionNumber");

-- CreateIndex
CREATE UNIQUE INDEX "shares_token_key" ON "shares"("token");

-- CreateIndex
CREATE INDEX "shares_granteeUserId_revokedAt_idx" ON "shares"("granteeUserId", "revokedAt");

-- CreateIndex
CREATE INDEX "shares_dataRoomId_subjectType_revokedAt_idx" ON "shares"("dataRoomId", "subjectType", "revokedAt");

-- AddForeignKey
ALTER TABLE "auth_identities" ADD CONSTRAINT "auth_identities_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "data_rooms" ADD CONSTRAINT "data_rooms_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "folders" ADD CONSTRAINT "folders_dataRoomId_fkey" FOREIGN KEY ("dataRoomId") REFERENCES "data_rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "folders" ADD CONSTRAINT "folders_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "folders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "files" ADD CONSTRAINT "files_dataRoomId_fkey" FOREIGN KEY ("dataRoomId") REFERENCES "data_rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "files" ADD CONSTRAINT "files_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "folders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "file_versions" ADD CONSTRAINT "file_versions_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "files"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "file_versions" ADD CONSTRAINT "file_versions_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shares" ADD CONSTRAINT "shares_dataRoomId_fkey" FOREIGN KEY ("dataRoomId") REFERENCES "data_rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shares" ADD CONSTRAINT "shares_subjectFolderId_fkey" FOREIGN KEY ("subjectFolderId") REFERENCES "folders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shares" ADD CONSTRAINT "shares_subjectFileId_fkey" FOREIGN KEY ("subjectFileId") REFERENCES "files"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shares" ADD CONSTRAINT "shares_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shares" ADD CONSTRAINT "shares_granteeUserId_fkey" FOREIGN KEY ("granteeUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- Invariants Prisma's schema language cannot express.
-- ---------------------------------------------------------------------------

-- Sibling name uniqueness at the top level. The @@unique on (parentId, name)
-- does not cover top-level rows, because Postgres treats NULLs as distinct and
-- would happily accept two root folders called "Financials" in the same room.
CREATE UNIQUE INDEX "folders_root_name_key"
  ON "folders" ("dataRoomId", "name") WHERE "parentId" IS NULL;

CREATE UNIQUE INDEX "files_root_name_key"
  ON "files" ("dataRoomId", "name") WHERE "folderId" IS NULL;

-- The materialised path is load-bearing for both subtree aggregation and share
-- access checks, so its shape is enforced here rather than trusted to callers.
ALTER TABLE "folders" ADD CONSTRAINT "folders_path_shape"
  CHECK ("path" LIKE '/%' AND "path" LIKE '%/');

ALTER TABLE "files" ADD CONSTRAINT "files_path_shape"
  CHECK ("path" LIKE '/%' AND "path" LIKE '%/');

ALTER TABLE "folders" ADD CONSTRAINT "folders_depth_bounded"
  CHECK ("depth" >= 0 AND "depth" <= 64);

ALTER TABLE "files" ADD CONSTRAINT "files_size_non_negative"
  CHECK ("sizeBytes" >= 0);

ALTER TABLE "file_versions" ADD CONSTRAINT "file_versions_size_non_negative"
  CHECK ("sizeBytes" >= 0);

-- A share points at exactly one subject, and subjectType agrees with which
-- foreign key is set.
ALTER TABLE "shares" ADD CONSTRAINT "shares_subject_matches_type" CHECK (
     ("subjectType" = 'DATA_ROOM' AND "subjectFolderId" IS NULL     AND "subjectFileId" IS NULL)
  OR ("subjectType" = 'FOLDER'    AND "subjectFolderId" IS NOT NULL AND "subjectFileId" IS NULL)
  OR ("subjectType" = 'FILE'      AND "subjectFolderId" IS NULL     AND "subjectFileId" IS NOT NULL)
);

-- A restricted share names a user; a public link carries a token. Never both,
-- never neither.
ALTER TABLE "shares" ADD CONSTRAINT "shares_principal_matches_mode" CHECK (
     ("mode" = 'RESTRICTED'  AND "granteeUserId" IS NOT NULL AND "token" IS NULL)
  OR ("mode" = 'PUBLIC_LINK' AND "granteeUserId" IS NULL     AND "token" IS NOT NULL)
);

-- One *active* restricted grant per person per subject. Scoping to
-- revokedAt IS NULL means revoking and re-sharing later is allowed, while
-- double-granting is not.
CREATE UNIQUE INDEX "shares_active_room_grant_key"
  ON "shares" ("dataRoomId", "granteeUserId")
  WHERE "subjectType" = 'DATA_ROOM' AND "mode" = 'RESTRICTED' AND "revokedAt" IS NULL;

CREATE UNIQUE INDEX "shares_active_folder_grant_key"
  ON "shares" ("subjectFolderId", "granteeUserId")
  WHERE "subjectType" = 'FOLDER' AND "mode" = 'RESTRICTED' AND "revokedAt" IS NULL;

CREATE UNIQUE INDEX "shares_active_file_grant_key"
  ON "shares" ("subjectFileId", "granteeUserId")
  WHERE "subjectType" = 'FILE' AND "mode" = 'RESTRICTED' AND "revokedAt" IS NULL;

-- Active public links are looked up by token on every anonymous request.
CREATE INDEX "shares_active_token_idx"
  ON "shares" ("token") WHERE "mode" = 'PUBLIC_LINK' AND "revokedAt" IS NULL;
