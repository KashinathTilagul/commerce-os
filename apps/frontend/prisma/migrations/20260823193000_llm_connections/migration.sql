CREATE TABLE "LlmConnection" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "apiKey" TEXT NOT NULL,
  "baseUrl" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "models" TEXT NOT NULL DEFAULT '[]',
  "errorMessage" TEXT,
  "lastTestedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LlmConnection_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LlmConnection_organizationId_provider_key" ON "LlmConnection"("organizationId", "provider");
CREATE INDEX "LlmConnection_organizationId_status_idx" ON "LlmConnection"("organizationId", "status");
ALTER TABLE "LlmConnection" ADD CONSTRAINT "LlmConnection_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
