-- PostgreSQL/Supabase migration. Apply with Supabase migration tooling before deployment.
-- Generated from Prisma schema diff and reviewed for data-preserving Phase 0/1 changes.

-- CreateEnum
CREATE TYPE "CampaignLaunchStatus" AS ENUM ('DRAFT', 'PLANNING', 'EXECUTING', 'REVIEW', 'APPROVAL_PENDING', 'APPROVED', 'PUBLISHING', 'PUBLISHED', 'PARTIALLY_PUBLISHED', 'BLOCKED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CampaignPriority" AS ENUM ('P0', 'P1', 'P2', 'P3');

-- CreateEnum
CREATE TYPE "CampaignRevisionStatus" AS ENUM ('PREPARED', 'APPROVED', 'REJECTED', 'REVOKED');

-- CreateEnum
CREATE TYPE "CampaignPublishStatus" AS ENUM ('INELIGIBLE', 'READY', 'PUBLISHING', 'PUBLISHED', 'PARTIALLY_PUBLISHED', 'BLOCKED');

-- CreateEnum
CREATE TYPE "CampaignApprovalMode" AS ENUM ('NONE', 'AUTO', 'FOUNDER');

-- CreateEnum
CREATE TYPE "CampaignItemStatus" AS ENUM ('PENDING', 'READY', 'LEASED', 'RUNNING', 'IN_REVIEW', 'COMPLETED', 'BLOCKED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CampaignAssigneeType" AS ENUM ('AGENT', 'SYSTEM');

-- CreateEnum
CREATE TYPE "CampaignValidationDomain" AS ENUM ('BRAND', 'ORIGINALITY', 'MARGIN', 'TRACKING', 'COMPLIANCE', 'INVENTORY', 'TECHNICAL', 'DEVICE');

-- CreateEnum
CREATE TYPE "CampaignValidationStatus" AS ENUM ('PENDING', 'RUNNING', 'PASS', 'FAIL', 'BLOCKED');

-- CreateEnum
CREATE TYPE "CampaignPublicationStatus" AS ENUM ('PENDING', 'RUNNING', 'CONFIRMED', 'FAILED', 'BLOCKED', 'ROLLED_BACK');

-- CreateEnum
CREATE TYPE "OutboxStatus" AS ENUM ('PENDING', 'PROCESSING', 'DISPATCHED', 'PROCESSED', 'FAILED');

-- DropForeignKey
ALTER TABLE "AgentPattern" DROP CONSTRAINT "AgentPattern_agentCode_fkey";

-- DropForeignKey
ALTER TABLE "AgentKnowledge" DROP CONSTRAINT "AgentKnowledge_agentCode_fkey";

-- DropIndex
DROP INDEX "Agent_code_key";

-- Preserve every organization while updating the canonical CEO identity.
UPDATE "Agent" SET "name" = 'Krishna' WHERE "code" = 'CEO' AND "name" = 'Arjun';

-- DropIndex
DROP INDEX "AgentPattern_agentCode_taskType_idx";

-- DropIndex
DROP INDEX "AgentPattern_agentCode_outcome_idx";

-- DropIndex
DROP INDEX "AgentPattern_agentCode_qualityScore_idx";

-- DropIndex
DROP INDEX "AgentKnowledge_agentCode_idx";

-- AlterTable
ALTER TABLE "Approval" ADD COLUMN     "itemCode" TEXT,
ADD COLUMN     "launchId" TEXT,
ADD COLUMN     "policyDecision" JSONB,
ADD COLUMN     "proofHash" TEXT,
ADD COLUMN     "revisionId" TEXT;

-- AlterTable
ALTER TABLE "Artifact" ADD COLUMN     "byteSize" INTEGER,
ADD COLUMN     "contentHash" TEXT;

-- AlterTable
ALTER TABLE "AgentRun" ADD COLUMN     "campaignItemId" TEXT;

-- CreateTable
CREATE TABLE "CampaignLaunch" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "brief" TEXT NOT NULL,
    "status" "CampaignLaunchStatus" NOT NULL DEFAULT 'DRAFT',
    "priority" "CampaignPriority" NOT NULL DEFAULT 'P2',
    "budgetCap" DECIMAL(12,2),
    "version" INTEGER NOT NULL DEFAULT 1,
    "rollbackState" JSONB,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CampaignLaunch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignRevision" (
    "id" TEXT NOT NULL,
    "launchId" TEXT NOT NULL,
    "revisionNum" INTEGER NOT NULL,
    "versionHash" TEXT NOT NULL,
    "evidenceJson" JSONB NOT NULL,
    "status" "CampaignRevisionStatus" NOT NULL DEFAULT 'PREPARED',
    "publishStatus" "CampaignPublishStatus" NOT NULL DEFAULT 'INELIGIBLE',
    "approvalMode" "CampaignApprovalMode" NOT NULL DEFAULT 'NONE',
    "approvedByUserId" TEXT,
    "approvedAt" TIMESTAMP(3),
    "publishStartedAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "previousThemeId" TEXT,
    "themeRevisionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CampaignRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignLaunchItem" (
    "id" TEXT NOT NULL,
    "launchId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "CampaignItemStatus" NOT NULL DEFAULT 'PENDING',
    "orderNum" INTEGER NOT NULL,
    "assigneeType" "CampaignAssigneeType" NOT NULL,
    "assigneeId" TEXT,
    "serviceKey" TEXT,
    "issueId" TEXT,
    "providerDraft" JSONB,
    "browserProof" JSONB,
    "evidenceHash" TEXT,
    "leaseOwnerId" TEXT,
    "leaseExpiresAt" TIMESTAMP(3),
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "version" INTEGER NOT NULL DEFAULT 0,
    "executionKey" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CampaignLaunchItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignLaunchDependency" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "dependsOnId" TEXT NOT NULL,

    CONSTRAINT "CampaignLaunchDependency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignValidation" (
    "id" TEXT NOT NULL,
    "launchId" TEXT NOT NULL,
    "revisionId" TEXT,
    "itemId" TEXT,
    "scopeKey" TEXT NOT NULL,
    "domain" "CampaignValidationDomain" NOT NULL,
    "validatorAgentId" TEXT NOT NULL,
    "status" "CampaignValidationStatus" NOT NULL DEFAULT 'PENDING',
    "evidenceHash" TEXT,
    "evidenceJson" JSONB,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CampaignValidation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignPublishLog" (
    "id" TEXT NOT NULL,
    "revisionId" TEXT NOT NULL,
    "itemId" TEXT,
    "provider" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "providerId" TEXT,
    "proofHash" TEXT,
    "providerResponse" JSONB,
    "status" "CampaignPublicationStatus" NOT NULL DEFAULT 'PENDING',
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CampaignPublishLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutboxMessage" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "aggregateType" TEXT NOT NULL,
    "aggregateId" TEXT NOT NULL,
    "aggregateVersion" INTEGER NOT NULL,
    "eventType" TEXT NOT NULL,
    "deduplicationKey" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "OutboxStatus" NOT NULL DEFAULT 'PENDING',
    "leaseToken" TEXT,
    "leaseExpiresAt" TIMESTAMP(3),
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastError" TEXT,
    "dispatchedAt" TIMESTAMP(3),
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OutboxMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignPolicy" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "autoApproveLimit" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "autoApproveEnabled" BOOLEAN NOT NULL DEFAULT false,
    "requireFirstApproval" BOOLEAN NOT NULL DEFAULT true,
    "riskFlags" JSONB,
    "inventoryChangeThreshold" INTEGER NOT NULL DEFAULT 0,
    "skuChangeThreshold" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CampaignPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CampaignLaunch_organizationId_status_idx" ON "CampaignLaunch"("organizationId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "CampaignLaunch_organizationId_code_key" ON "CampaignLaunch"("organizationId", "code");

-- CreateIndex
CREATE INDEX "CampaignRevision_launchId_status_idx" ON "CampaignRevision"("launchId", "status");

-- CreateIndex
CREATE INDEX "CampaignRevision_approvedByUserId_idx" ON "CampaignRevision"("approvedByUserId");

-- CreateIndex
CREATE UNIQUE INDEX "CampaignRevision_launchId_revisionNum_key" ON "CampaignRevision"("launchId", "revisionNum");

-- CreateIndex
CREATE UNIQUE INDEX "CampaignLaunchItem_issueId_key" ON "CampaignLaunchItem"("issueId");

-- CreateIndex
CREATE UNIQUE INDEX "CampaignLaunchItem_executionKey_key" ON "CampaignLaunchItem"("executionKey");

-- CreateIndex
CREATE INDEX "CampaignLaunchItem_launchId_status_idx" ON "CampaignLaunchItem"("launchId", "status");

-- CreateIndex
CREATE INDEX "CampaignLaunchItem_assigneeId_status_idx" ON "CampaignLaunchItem"("assigneeId", "status");

-- CreateIndex
CREATE INDEX "CampaignLaunchItem_leaseOwnerId_idx" ON "CampaignLaunchItem"("leaseOwnerId");

-- CreateIndex
CREATE UNIQUE INDEX "CampaignLaunchItem_launchId_code_key" ON "CampaignLaunchItem"("launchId", "code");

-- CreateIndex
CREATE INDEX "CampaignLaunchDependency_itemId_idx" ON "CampaignLaunchDependency"("itemId");

-- CreateIndex
CREATE INDEX "CampaignLaunchDependency_dependsOnId_idx" ON "CampaignLaunchDependency"("dependsOnId");

-- CreateIndex
CREATE UNIQUE INDEX "CampaignLaunchDependency_itemId_dependsOnId_key" ON "CampaignLaunchDependency"("itemId", "dependsOnId");

-- CreateIndex
CREATE INDEX "CampaignValidation_revisionId_idx" ON "CampaignValidation"("revisionId");

-- CreateIndex
CREATE INDEX "CampaignValidation_itemId_idx" ON "CampaignValidation"("itemId");

-- CreateIndex
CREATE INDEX "CampaignValidation_validatorAgentId_status_idx" ON "CampaignValidation"("validatorAgentId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "CampaignValidation_launchId_scopeKey_domain_key" ON "CampaignValidation"("launchId", "scopeKey", "domain");

-- CreateIndex
CREATE UNIQUE INDEX "CampaignPublishLog_idempotencyKey_key" ON "CampaignPublishLog"("idempotencyKey");

-- CreateIndex
CREATE INDEX "CampaignPublishLog_revisionId_status_idx" ON "CampaignPublishLog"("revisionId", "status");

-- CreateIndex
CREATE INDEX "CampaignPublishLog_itemId_idx" ON "CampaignPublishLog"("itemId");

-- CreateIndex
CREATE UNIQUE INDEX "OutboxMessage_deduplicationKey_key" ON "OutboxMessage"("deduplicationKey");

-- CreateIndex
CREATE INDEX "OutboxMessage_status_nextAttemptAt_idx" ON "OutboxMessage"("status", "nextAttemptAt");

-- CreateIndex
CREATE INDEX "OutboxMessage_organizationId_createdAt_idx" ON "OutboxMessage"("organizationId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CampaignPolicy_organizationId_key" ON "CampaignPolicy"("organizationId");

-- CreateIndex
CREATE INDEX "Approval_launchId_idx" ON "Approval"("launchId");

-- CreateIndex
CREATE INDEX "Approval_revisionId_idx" ON "Approval"("revisionId");

-- CreateIndex
CREATE INDEX "AgentPattern_organizationId_agentCode_taskType_idx" ON "AgentPattern"("organizationId", "agentCode", "taskType");

-- CreateIndex
CREATE INDEX "AgentPattern_organizationId_agentCode_outcome_idx" ON "AgentPattern"("organizationId", "agentCode", "outcome");

-- CreateIndex
CREATE INDEX "AgentPattern_organizationId_agentCode_qualityScore_idx" ON "AgentPattern"("organizationId", "agentCode", "qualityScore");

-- CreateIndex
CREATE INDEX "AgentKnowledge_organizationId_agentCode_idx" ON "AgentKnowledge"("organizationId", "agentCode");

-- CreateIndex
CREATE INDEX "AgentRun_campaignItemId_idx" ON "AgentRun"("campaignItemId");

-- AddForeignKey
ALTER TABLE "CampaignLaunch" ADD CONSTRAINT "CampaignLaunch_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignRevision" ADD CONSTRAINT "CampaignRevision_launchId_fkey" FOREIGN KEY ("launchId") REFERENCES "CampaignLaunch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignRevision" ADD CONSTRAINT "CampaignRevision_approvedByUserId_fkey" FOREIGN KEY ("approvedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignLaunchItem" ADD CONSTRAINT "CampaignLaunchItem_launchId_fkey" FOREIGN KEY ("launchId") REFERENCES "CampaignLaunch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignLaunchItem" ADD CONSTRAINT "CampaignLaunchItem_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "Agent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignLaunchItem" ADD CONSTRAINT "CampaignLaunchItem_leaseOwnerId_fkey" FOREIGN KEY ("leaseOwnerId") REFERENCES "Agent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignLaunchItem" ADD CONSTRAINT "CampaignLaunchItem_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "Issue"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignLaunchDependency" ADD CONSTRAINT "CampaignLaunchDependency_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "CampaignLaunchItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignLaunchDependency" ADD CONSTRAINT "CampaignLaunchDependency_dependsOnId_fkey" FOREIGN KEY ("dependsOnId") REFERENCES "CampaignLaunchItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignValidation" ADD CONSTRAINT "CampaignValidation_launchId_fkey" FOREIGN KEY ("launchId") REFERENCES "CampaignLaunch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignValidation" ADD CONSTRAINT "CampaignValidation_revisionId_fkey" FOREIGN KEY ("revisionId") REFERENCES "CampaignRevision"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignValidation" ADD CONSTRAINT "CampaignValidation_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "CampaignLaunchItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignValidation" ADD CONSTRAINT "CampaignValidation_validatorAgentId_fkey" FOREIGN KEY ("validatorAgentId") REFERENCES "Agent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignPublishLog" ADD CONSTRAINT "CampaignPublishLog_revisionId_fkey" FOREIGN KEY ("revisionId") REFERENCES "CampaignRevision"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignPublishLog" ADD CONSTRAINT "CampaignPublishLog_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "CampaignLaunchItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutboxMessage" ADD CONSTRAINT "OutboxMessage_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignPolicy" ADD CONSTRAINT "CampaignPolicy_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Approval" ADD CONSTRAINT "Approval_launchId_fkey" FOREIGN KEY ("launchId") REFERENCES "CampaignLaunch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Approval" ADD CONSTRAINT "Approval_revisionId_fkey" FOREIGN KEY ("revisionId") REFERENCES "CampaignRevision"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentPattern" ADD CONSTRAINT "AgentPattern_organizationId_agentCode_fkey" FOREIGN KEY ("organizationId", "agentCode") REFERENCES "Agent"("organizationId", "code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentKnowledge" ADD CONSTRAINT "AgentKnowledge_organizationId_agentCode_fkey" FOREIGN KEY ("organizationId", "agentCode") REFERENCES "Agent"("organizationId", "code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentRun" ADD CONSTRAINT "AgentRun_campaignItemId_fkey" FOREIGN KEY ("campaignItemId") REFERENCES "CampaignLaunchItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- These tables are server-only. Public API roles receive no policies.
ALTER TABLE "CampaignLaunch" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CampaignRevision" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CampaignLaunchItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CampaignLaunchDependency" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CampaignValidation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CampaignPublishLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OutboxMessage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CampaignPolicy" ENABLE ROW LEVEL SECURITY;
