-- Add interactiveColor to BrandProfile
ALTER TABLE "BrandProfile"
  ADD COLUMN "interactiveColor" TEXT NOT NULL DEFAULT '#0ea5e9';
