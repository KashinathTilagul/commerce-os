DROP TABLE IF EXISTS "LlmConnection";
DROP TABLE IF EXISTS "UserPreference";

ALTER TABLE "SystemSetting"
DROP COLUMN IF EXISTS "speechProvider",
DROP COLUMN IF EXISTS "speechApiKey",
DROP COLUMN IF EXISTS "krishnaLlmMode",
DROP COLUMN IF EXISTS "krishnaN8nWebhookPath",
DROP COLUMN IF EXISTS "krishnaN8nFallback";
