ALTER TABLE "SystemSetting" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;
ALTER TABLE "SystemSetting" ADD COLUMN IF NOT EXISTS "composioApiKey" TEXT NOT NULL DEFAULT '';
ALTER TABLE "SystemSetting" ADD COLUMN IF NOT EXISTS "speechProvider" TEXT NOT NULL DEFAULT 'openai';
ALTER TABLE "SystemSetting" ADD COLUMN IF NOT EXISTS "speechApiKey" TEXT NOT NULL DEFAULT '';

UPDATE "SystemSetting"
SET "organizationId" = (SELECT "id" FROM "Organization" ORDER BY "createdAt" ASC LIMIT 1)
WHERE "organizationId" IS NULL;

DELETE FROM "SystemSetting" WHERE "organizationId" IS NULL;

ALTER TABLE "SystemSetting" ALTER COLUMN "organizationId" SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "SystemSetting_organizationId_key" ON "SystemSetting"("organizationId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'SystemSetting_organizationId_fkey'
  ) THEN
    ALTER TABLE "SystemSetting" ADD CONSTRAINT "SystemSetting_organizationId_fkey"
      FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
