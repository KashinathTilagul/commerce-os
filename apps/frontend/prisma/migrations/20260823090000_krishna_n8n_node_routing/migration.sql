ALTER TABLE "SystemSetting"
ADD COLUMN "krishnaLlmMode" TEXT NOT NULL DEFAULT 'direct',
ADD COLUMN "krishnaN8nWebhookPath" TEXT NOT NULL DEFAULT 'krishna-llm-nodes',
ADD COLUMN "krishnaN8nFallback" BOOLEAN NOT NULL DEFAULT true;
