-- Owner: packages/db. Decouples TrackX user IDs from external auth provider IDs.
CREATE TYPE "AuthProvider" AS ENUM ('supabase', 'neon');

CREATE TABLE "auth_identities" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "provider" "AuthProvider" NOT NULL,
    "providerUserId" TEXT NOT NULL,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "auth_identities_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "auth_identities_provider_providerUserId_key"
ON "auth_identities"("provider", "providerUserId");

CREATE INDEX "auth_identities_userId_provider_idx"
ON "auth_identities"("userId", "provider");

ALTER TABLE "auth_identities"
ADD CONSTRAINT "auth_identities_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "auth_identities" (
    "id",
    "userId",
    "provider",
    "providerUserId",
    "email",
    "createdAt",
    "updatedAt"
)
SELECT
    gen_random_uuid(),
    "id",
    'supabase'::"AuthProvider",
    "id"::TEXT,
    "email",
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "users"
WHERE "email" IS NOT NULL
  AND "email" <> 'local@trackx.dev'
ON CONFLICT ("provider", "providerUserId") DO NOTHING;

ALTER TABLE "auth_identities" ENABLE ROW LEVEL SECURITY;
