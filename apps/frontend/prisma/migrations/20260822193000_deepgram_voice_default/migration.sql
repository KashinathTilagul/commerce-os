ALTER TABLE "SystemSetting" ALTER COLUMN "speechProvider" SET DEFAULT 'deepgram';
ALTER TABLE "UserPreference" ALTER COLUMN "ttsVoice" SET DEFAULT 'deepgram:flux-naveen-en';

UPDATE "SystemSetting"
SET "speechProvider" = 'deepgram'
WHERE "speechProvider" = 'openai' AND "speechApiKey" = '';

-- Never spend a previously configured OpenAI key on voice implicitly. Keep the
-- encrypted value untouched for rollback, but route speech locally until the
-- organization explicitly supplies its own Deepgram key.
UPDATE "SystemSetting"
SET "speechProvider" = 'local'
WHERE "speechProvider" = 'openai' AND "speechApiKey" <> '';

UPDATE "UserPreference"
SET "ttsVoice" = 'deepgram:flux-naveen-en'
WHERE "ttsVoice" = 'openai:onyx';

UPDATE "SystemSetting"
SET "primaryProvider" = 'omniroute',
    "primaryModel" = 'auto/best-free',
    "primaryBaseUrl" = 'http://omniroute:20128/v1'
WHERE "primaryProvider" = 'openrouter'
  AND "primaryModel" IN ('google/gemma-3-27b-it:free', 'meta-llama/llama-3.3-70b-instruct:free')
  AND "primaryApiKey" = '';
