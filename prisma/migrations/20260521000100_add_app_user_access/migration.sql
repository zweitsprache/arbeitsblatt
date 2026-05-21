CREATE TABLE "AppUserAccess" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "email" TEXT,
    "name" TEXT,
    "role" TEXT NOT NULL DEFAULT 'editor',
    "settings" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AppUserAccess_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AppUserAccess_userId_key" ON "AppUserAccess"("userId");
CREATE INDEX "AppUserAccess_email_idx" ON "AppUserAccess"("email");
CREATE INDEX "AppUserAccess_role_idx" ON "AppUserAccess"("role");