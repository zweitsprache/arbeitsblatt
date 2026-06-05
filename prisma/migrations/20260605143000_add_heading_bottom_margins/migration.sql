-- Add configurable heading bottom margins per level (h1-h4)
ALTER TABLE "BrandProfile"
  ADD COLUMN "h1BottomMargin" TEXT,
  ADD COLUMN "h2BottomMargin" TEXT,
  ADD COLUMN "h3BottomMargin" TEXT,
  ADD COLUMN "h4BottomMargin" TEXT;
