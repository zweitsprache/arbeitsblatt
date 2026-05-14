-- Add per-level heading numbering format settings to brand profiles.
ALTER TABLE "BrandProfile"
  ADD COLUMN "h1NumberFormat" TEXT,
  ADD COLUMN "h2NumberFormat" TEXT,
  ADD COLUMN "h3NumberFormat" TEXT,
  ADD COLUMN "h4NumberFormat" TEXT;
