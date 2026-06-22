-- CreateEnum
CREATE TYPE "Pos" AS ENUM (
  'noun',
  'verb',
  'adjective',
  'adverb',
  'pronoun',
  'preposition',
  'conjunction',
  'interjection',
  'phrase'
);

-- CreateTable
CREATE TABLE "Entry" (
  "id" TEXT NOT NULL,
  "lemma" TEXT NOT NULL,
  "pos" "Pos" NOT NULL,
  "level" TEXT NOT NULL DEFAULT 'A1',
  "book" TEXT NOT NULL DEFAULT 'Treffpunkt Schweiz',
  "lesson" INTEGER NOT NULL,
  "lessonTitle" TEXT,
  "module" TEXT NOT NULL,
  "moduleTitle" TEXT,
  "ipa" TEXT,
  "register" TEXT,
  "tags" TEXT[] NOT NULL,
  "posData" JSONB NOT NULL,
  "photoId" TEXT,
  "notes" TEXT,
  "extractionConfidence" TEXT,
  "dateAdded" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Entry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerbDetail" (
  "entryId" TEXT NOT NULL,
  "infinitive" TEXT NOT NULL,
  "auxiliary" TEXT NOT NULL,
  "regularity" TEXT NOT NULL,
  "separable" BOOLEAN NOT NULL DEFAULT false,
  "stemChange" BOOLEAN NOT NULL DEFAULT false,
  "stemChangeType" TEXT,
  "ablautPattern" TEXT,
  "ablautClass" TEXT,
  "prepObject" TEXT,
  "prepCase" TEXT,

  CONSTRAINT "VerbDetail_pkey" PRIMARY KEY ("entryId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Entry_lemma_lesson_module_key" ON "Entry"("lemma", "lesson", "module");

-- CreateIndex
CREATE INDEX "Entry_pos_idx" ON "Entry"("pos");

-- CreateIndex
CREATE INDEX "Entry_lesson_module_idx" ON "Entry"("lesson", "module");

-- CreateIndex
CREATE INDEX "VerbDetail_stemChange_idx" ON "VerbDetail"("stemChange");

-- CreateIndex
CREATE INDEX "VerbDetail_auxiliary_idx" ON "VerbDetail"("auxiliary");

-- CreateIndex
CREATE INDEX "VerbDetail_regularity_idx" ON "VerbDetail"("regularity");

-- AddForeignKey
ALTER TABLE "VerbDetail" ADD CONSTRAINT "VerbDetail_entryId_fkey"
  FOREIGN KEY ("entryId") REFERENCES "Entry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
