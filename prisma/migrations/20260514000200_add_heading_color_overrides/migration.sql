-- Add per-level heading text and heading number color overrides.
ALTER TABLE "BrandProfile"
  ADD COLUMN "h1HeadingColor" TEXT,
  ADD COLUMN "h2HeadingColor" TEXT,
  ADD COLUMN "h3HeadingColor" TEXT,
  ADD COLUMN "h4HeadingColor" TEXT,
  ADD COLUMN "h1HeadingNumberColor" TEXT,
  ADD COLUMN "h2HeadingNumberColor" TEXT,
  ADD COLUMN "h3HeadingNumberColor" TEXT,
  ADD COLUMN "h4HeadingNumberColor" TEXT;
