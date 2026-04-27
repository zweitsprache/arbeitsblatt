-- CreateEnum
CREATE TYPE "AiToolRunStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'ERROR', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "AiToolMessageRole" AS ENUM ('USER', 'ASSISTANT', 'SYSTEM');

-- CreateEnum
CREATE TYPE "AiToolMessageKind" AS ENUM ('USER_TEXT', 'ASSISTANT_TEXT', 'QUESTION_CARD', 'ANSWER_CARD', 'REVIEW_CARD', 'RESULT_CARD', 'ERROR_CARD', 'SYSTEM_STATUS');

-- CreateEnum
CREATE TYPE "ContentType" AS ENUM ('WORKSHEET', 'EBOOK', 'COURSE', 'AI_TOOL', 'PRESENTATION');

-- CreateTable
CREATE TABLE "Folder" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT,

    CONSTRAINT "Folder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Worksheet" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'worksheet',
    "title" TEXT NOT NULL DEFAULT 'Untitled Worksheet',
    "description" TEXT,
    "slug" TEXT NOT NULL,
    "blocks" JSONB NOT NULL DEFAULT '[]',
    "settings" JSONB NOT NULL DEFAULT '{}',
    "published" BOOLEAN NOT NULL DEFAULT false,
    "thumbnail" TEXT,
    "translations" JSONB NOT NULL DEFAULT '{}',
    "translatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "folderId" TEXT,
    "userId" TEXT,

    CONSTRAINT "Worksheet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EBook" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'Untitled E-Book',
    "slug" TEXT NOT NULL,
    "chapters" JSONB NOT NULL DEFAULT '[]',
    "coverSettings" JSONB NOT NULL DEFAULT '{}',
    "settings" JSONB NOT NULL DEFAULT '{}',
    "published" BOOLEAN NOT NULL DEFAULT false,
    "thumbnail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "folderId" TEXT,
    "userId" TEXT,

    CONSTRAINT "EBook_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Course" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'Untitled Course',
    "slug" TEXT NOT NULL,
    "structure" JSONB NOT NULL DEFAULT '[]',
    "coverSettings" JSONB NOT NULL DEFAULT '{}',
    "settings" JSONB NOT NULL DEFAULT '{}',
    "published" BOOLEAN NOT NULL DEFAULT false,
    "thumbnail" TEXT,
    "translations" JSONB NOT NULL DEFAULT '{}',
    "i18nexusNamespace" TEXT,
    "translatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "folderId" TEXT,
    "userId" TEXT,

    CONSTRAINT "Course_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Presentation" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'Untitled Presentation',
    "slug" TEXT NOT NULL,
    "blocks" JSONB NOT NULL DEFAULT '[]',
    "settings" JSONB NOT NULL DEFAULT '{}',
    "published" BOOLEAN NOT NULL DEFAULT false,
    "thumbnail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "folderId" TEXT,
    "userId" TEXT,

    CONSTRAINT "Presentation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiToolRun" (
    "id" TEXT NOT NULL,
    "toolKey" TEXT NOT NULL,
    "status" "AiToolRunStatus" NOT NULL DEFAULT 'ACTIVE',
    "userId" TEXT,
    "projectId" TEXT,
    "worksheetId" TEXT,
    "worksheetBlockId" TEXT,
    "context" JSONB NOT NULL DEFAULT '{}',
    "state" JSONB NOT NULL DEFAULT '{}',
    "finalResult" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "AiToolRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiToolMessage" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "role" "AiToolMessageRole" NOT NULL,
    "kind" "AiToolMessageKind" NOT NULL,
    "payload" JSONB NOT NULL,
    "sequence" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiToolMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerbCache" (
    "id" TEXT NOT NULL,
    "infinitive" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VerbCache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrandProfile" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "bodyFont" TEXT NOT NULL DEFAULT 'Asap Condensed, sans-serif',
    "headlineFont" TEXT NOT NULL DEFAULT 'Asap Condensed, sans-serif',
    "headlineWeight" INTEGER NOT NULL DEFAULT 700,
    "subHeadlineFont" TEXT NOT NULL DEFAULT 'Asap Condensed, sans-serif',
    "subHeadlineWeight" INTEGER NOT NULL DEFAULT 700,
    "headerFooterFont" TEXT NOT NULL DEFAULT 'Asap Condensed, sans-serif',
    "googleFontsUrl" TEXT NOT NULL DEFAULT '',
    "translationFontOverrides" JSONB NOT NULL DEFAULT '{}',
    "h1Size" TEXT,
    "h1Weight" INTEGER,
    "h2Size" TEXT,
    "h2Weight" INTEGER,
    "h3Size" TEXT,
    "h3Weight" INTEGER,
    "textBaseSize" TEXT,
    "primaryColor" TEXT NOT NULL DEFAULT '#1a1a1a',
    "accentColor" TEXT,
    "interactiveColor" TEXT NOT NULL DEFAULT '#0ea5e9',
    "logo" TEXT NOT NULL DEFAULT '',
    "iconLogo" TEXT,
    "favicon" TEXT,
    "organization" TEXT NOT NULL DEFAULT '',
    "teacher" TEXT NOT NULL DEFAULT '',
    "headerRight" TEXT NOT NULL DEFAULT '',
    "footerLeft" TEXT NOT NULL DEFAULT '',
    "footerCenter" TEXT NOT NULL DEFAULT '',
    "footerRight" TEXT NOT NULL DEFAULT '',
    "pdfFontSize" DOUBLE PRECISION,
    "pdfTranslationScale" DOUBLE PRECISION,
    "gameSettings" JSONB NOT NULL DEFAULT '{}',
    "pageTitle" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BrandProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrandSubProfile" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "brandProfileId" TEXT NOT NULL,
    "headerLeftV1" TEXT NOT NULL DEFAULT '',
    "headerRightV1" TEXT NOT NULL DEFAULT '',
    "footerLeftV1" TEXT NOT NULL DEFAULT '',
    "footerRightV1" TEXT NOT NULL DEFAULT '',
    "headerLeftV2" TEXT NOT NULL DEFAULT '',
    "headerRightV2" TEXT NOT NULL DEFAULT '',
    "footerLeftV2" TEXT NOT NULL DEFAULT '',
    "footerRightV2" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BrandSubProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "brandSettings" JSONB NOT NULL DEFAULT '{}',
    "brandProfileId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "domain" TEXT,
    "settings" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectContent" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "contentType" "ContentType" NOT NULL,
    "contentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectContent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FlashcardCollection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FlashcardCollection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FlashcardCollectionSet" (
    "id" TEXT NOT NULL,
    "collectionId" TEXT NOT NULL,
    "worksheetId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FlashcardCollectionSet_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Folder_parentId_idx" ON "Folder"("parentId");

-- CreateIndex
CREATE INDEX "Folder_userId_idx" ON "Folder"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Worksheet_slug_key" ON "Worksheet"("slug");

-- CreateIndex
CREATE INDEX "Worksheet_slug_idx" ON "Worksheet"("slug");

-- CreateIndex
CREATE INDEX "Worksheet_folderId_idx" ON "Worksheet"("folderId");

-- CreateIndex
CREATE INDEX "Worksheet_userId_idx" ON "Worksheet"("userId");

-- CreateIndex
CREATE INDEX "Worksheet_type_idx" ON "Worksheet"("type");

-- CreateIndex
CREATE UNIQUE INDEX "EBook_slug_key" ON "EBook"("slug");

-- CreateIndex
CREATE INDEX "EBook_slug_idx" ON "EBook"("slug");

-- CreateIndex
CREATE INDEX "EBook_folderId_idx" ON "EBook"("folderId");

-- CreateIndex
CREATE INDEX "EBook_userId_idx" ON "EBook"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Course_slug_key" ON "Course"("slug");

-- CreateIndex
CREATE INDEX "Course_slug_idx" ON "Course"("slug");

-- CreateIndex
CREATE INDEX "Course_folderId_idx" ON "Course"("folderId");

-- CreateIndex
CREATE INDEX "Course_userId_idx" ON "Course"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Presentation_slug_key" ON "Presentation"("slug");

-- CreateIndex
CREATE INDEX "Presentation_slug_idx" ON "Presentation"("slug");

-- CreateIndex
CREATE INDEX "Presentation_folderId_idx" ON "Presentation"("folderId");

-- CreateIndex
CREATE INDEX "Presentation_userId_idx" ON "Presentation"("userId");

-- CreateIndex
CREATE INDEX "AiToolRun_toolKey_idx" ON "AiToolRun"("toolKey");

-- CreateIndex
CREATE INDEX "AiToolRun_status_idx" ON "AiToolRun"("status");

-- CreateIndex
CREATE INDEX "AiToolRun_userId_idx" ON "AiToolRun"("userId");

-- CreateIndex
CREATE INDEX "AiToolRun_projectId_idx" ON "AiToolRun"("projectId");

-- CreateIndex
CREATE INDEX "AiToolRun_worksheetId_idx" ON "AiToolRun"("worksheetId");

-- CreateIndex
CREATE INDEX "AiToolRun_createdAt_idx" ON "AiToolRun"("createdAt");

-- CreateIndex
CREATE INDEX "AiToolMessage_runId_idx" ON "AiToolMessage"("runId");

-- CreateIndex
CREATE INDEX "AiToolMessage_role_idx" ON "AiToolMessage"("role");

-- CreateIndex
CREATE INDEX "AiToolMessage_kind_idx" ON "AiToolMessage"("kind");

-- CreateIndex
CREATE INDEX "AiToolMessage_createdAt_idx" ON "AiToolMessage"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AiToolMessage_runId_sequence_key" ON "AiToolMessage"("runId", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "VerbCache_infinitive_key" ON "VerbCache"("infinitive");

-- CreateIndex
CREATE INDEX "VerbCache_infinitive_idx" ON "VerbCache"("infinitive");

-- CreateIndex
CREATE UNIQUE INDEX "BrandProfile_slug_key" ON "BrandProfile"("slug");

-- CreateIndex
CREATE INDEX "BrandProfile_slug_idx" ON "BrandProfile"("slug");

-- CreateIndex
CREATE INDEX "BrandSubProfile_brandProfileId_idx" ON "BrandSubProfile"("brandProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "Client_slug_key" ON "Client"("slug");

-- CreateIndex
CREATE INDEX "Client_slug_idx" ON "Client"("slug");

-- CreateIndex
CREATE INDEX "Client_brandProfileId_idx" ON "Client"("brandProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "Project_slug_key" ON "Project"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Project_domain_key" ON "Project"("domain");

-- CreateIndex
CREATE INDEX "Project_slug_idx" ON "Project"("slug");

-- CreateIndex
CREATE INDEX "Project_clientId_idx" ON "Project"("clientId");

-- CreateIndex
CREATE INDEX "ProjectContent_contentId_idx" ON "ProjectContent"("contentId");

-- CreateIndex
CREATE INDEX "ProjectContent_projectId_idx" ON "ProjectContent"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectContent_projectId_contentType_contentId_key" ON "ProjectContent"("projectId", "contentType", "contentId");

-- CreateIndex
CREATE UNIQUE INDEX "FlashcardCollection_slug_key" ON "FlashcardCollection"("slug");

-- CreateIndex
CREATE INDEX "FlashcardCollection_slug_idx" ON "FlashcardCollection"("slug");

-- CreateIndex
CREATE INDEX "FlashcardCollection_userId_idx" ON "FlashcardCollection"("userId");

-- CreateIndex
CREATE INDEX "FlashcardCollectionSet_collectionId_idx" ON "FlashcardCollectionSet"("collectionId");

-- CreateIndex
CREATE INDEX "FlashcardCollectionSet_worksheetId_idx" ON "FlashcardCollectionSet"("worksheetId");

-- CreateIndex
CREATE UNIQUE INDEX "FlashcardCollectionSet_collectionId_worksheetId_key" ON "FlashcardCollectionSet"("collectionId", "worksheetId");

-- AddForeignKey
ALTER TABLE "Folder" ADD CONSTRAINT "Folder_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Folder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Worksheet" ADD CONSTRAINT "Worksheet_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "Folder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiToolMessage" ADD CONSTRAINT "AiToolMessage_runId_fkey" FOREIGN KEY ("runId") REFERENCES "AiToolRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandSubProfile" ADD CONSTRAINT "BrandSubProfile_brandProfileId_fkey" FOREIGN KEY ("brandProfileId") REFERENCES "BrandProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_brandProfileId_fkey" FOREIGN KEY ("brandProfileId") REFERENCES "BrandProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectContent" ADD CONSTRAINT "ProjectContent_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlashcardCollectionSet" ADD CONSTRAINT "FlashcardCollectionSet_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "FlashcardCollection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
