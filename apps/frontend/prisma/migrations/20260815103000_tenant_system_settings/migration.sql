ALTER TABLE "SystemSetting" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "SystemSetting" ADD COLUMN "composioApiKey" TEXT NOT NULL DEFAULT '';
ALTER TABLE "SystemSetting" ADD COLUMN "speechProvider" TEXT NOT NULL DEFAULT 'openai';
ALTER TABLE "SystemSetting" ADD COLUMN "speechApiKey" TEXT NOT NULL DEFAULT '';

UPDATE "SystemSetting"
SET "organizationId" = (SELECT "id" FROM "Organization" ORDER BY "createdAt" ASC LIMIT 1)
WHERE "organizationId" IS NULL;

DELETE FROM "SystemSetting" WHERE "organizationId" IS NULL;

ALTER TABLE "SystemSetting" ALTER COLUMN "organizationId" SET NOT NULL;
CREATE UNIQUE INDEX "SystemSetting_organizationId_key" ON "SystemSetting"("organizationId");
ALTER TABLE "SystemSetting" ADD CONSTRAINT "SystemSetting_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
