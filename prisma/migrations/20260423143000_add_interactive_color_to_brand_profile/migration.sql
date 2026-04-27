-- Add interactive color for online-only interactive UI accents.
ALTER TABLE "BrandProfile"
ADD COLUMN IF NOT EXISTS "interactiveColor" TEXT NOT NULL DEFAULT '#0ea5e9';
