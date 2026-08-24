ALTER TABLE "SystemSetting"
ALTER COLUMN "omnirouteImageModel" SET DEFAULT '';

UPDATE "SystemSetting"
SET "omnirouteImageModel" = ''
WHERE "omnirouteImageModel" IN (
  'google/gemini-2.0-flash-exp:image',
  'antigravity/gemini-3.1-flash-image'
);
