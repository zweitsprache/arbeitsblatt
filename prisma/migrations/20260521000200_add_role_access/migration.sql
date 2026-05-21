-- Role-based access templates. Admin is implicit (env), so only editor tiers and the basic user role are stored.
CREATE TABLE "RoleAccess" (
  "role"      TEXT PRIMARY KEY,
  "settings"  JSONB NOT NULL DEFAULT '{}'::jsonb,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO "RoleAccess" ("role", "settings") VALUES
  ('platinum', '{}'::jsonb),
  ('gold',     '{}'::jsonb),
  ('silver',   '{}'::jsonb),
  ('bronze',   '{}'::jsonb),
  ('user',     '{}'::jsonb)
ON CONFLICT ("role") DO NOTHING;

-- Migrate any pre-existing per-user roles to the new role list.
UPDATE "AppUserAccess" SET "role" = 'bronze' WHERE "role" = 'editor';
UPDATE "AppUserAccess" SET "role" = 'bronze' WHERE "role" NOT IN ('platinum','gold','silver','bronze','user');
