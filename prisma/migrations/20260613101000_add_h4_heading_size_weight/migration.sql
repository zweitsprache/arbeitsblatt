-- Add per-brand H4 heading size/weight settings.
ALTER TABLE "BrandProfile"
  ADD COLUMN "h4Size" TEXT,
  ADD COLUMN "h4Weight" INTEGER;
