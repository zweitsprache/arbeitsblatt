-- Align vocabulary tables with the Zod source of truth.

ALTER TABLE "Entry" ADD COLUMN "frequency_rank" INTEGER;
ALTER TABLE "Entry" ADD COLUMN "pronunciation" JSONB;
ALTER TABLE "Entry" ADD COLUMN "source" JSONB;
ALTER TABLE "Entry" ADD COLUMN "examples" JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE "Entry" ADD COLUMN "domain" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Entry" ADD COLUMN "date_added" TIMESTAMP(3);
ALTER TABLE "Entry" ADD COLUMN "extraction_confidence" TEXT;
ALTER TABLE "Entry" ADD COLUMN "pos_data" JSONB;

UPDATE "Entry"
SET
  "pronunciation" = jsonb_build_object(
    'ipa', "ipa",
    'syllables', NULL,
    'stress', NULL,
    'audio', NULL
  ),
  "source" = jsonb_build_object(
    'book', "book",
    'lesson', "lesson",
    'lesson_title', "lessonTitle",
    'module', "module",
    'module_title', "moduleTitle",
    'page', NULL,
    'photo_id', "photoId"
  ),
  "date_added" = "dateAdded",
  "extraction_confidence" = COALESCE("extractionConfidence", 'medium'),
  "pos_data" = "posData";

ALTER TABLE "Entry" ALTER COLUMN "pronunciation" SET NOT NULL;
ALTER TABLE "Entry" ALTER COLUMN "source" SET NOT NULL;
ALTER TABLE "Entry" ALTER COLUMN "date_added" SET NOT NULL;
ALTER TABLE "Entry" ALTER COLUMN "date_added" SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Entry" ALTER COLUMN "extraction_confidence" SET NOT NULL;
ALTER TABLE "Entry" ALTER COLUMN "pos_data" SET NOT NULL;

ALTER TABLE "Entry" DROP CONSTRAINT IF EXISTS "Entry_lemma_lesson_module_key";
DROP INDEX IF EXISTS "Entry_lemma_lesson_module_key";
DROP INDEX IF EXISTS "Entry_lesson_module_idx";

ALTER TABLE "Entry" DROP COLUMN "book";
ALTER TABLE "Entry" DROP COLUMN "lesson";
ALTER TABLE "Entry" DROP COLUMN "lessonTitle";
ALTER TABLE "Entry" DROP COLUMN "module";
ALTER TABLE "Entry" DROP COLUMN "moduleTitle";
ALTER TABLE "Entry" DROP COLUMN "ipa";
ALTER TABLE "Entry" DROP COLUMN "photoId";
ALTER TABLE "Entry" DROP COLUMN "extractionConfidence";
ALTER TABLE "Entry" DROP COLUMN "dateAdded";
ALTER TABLE "Entry" DROP COLUMN "posData";

ALTER TABLE "VerbDetail" ADD COLUMN "separablePrefix" TEXT;
ALTER TABLE "VerbDetail" ADD COLUMN "reflexive" TEXT NOT NULL DEFAULT 'none';

CREATE INDEX "Entry_source_lesson_module_idx"
  ON "Entry" (((source->>'lesson')::integer), (source->>'module'));

CREATE UNIQUE INDEX "Entry_lemma_source_lesson_module_key"
  ON "Entry" ("lemma", ((source->>'lesson')::integer), (source->>'module'));
