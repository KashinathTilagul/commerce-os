-- CreateTable
CREATE TABLE "ProductLaunch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "productType" TEXT NOT NULL,
    "templateKey" TEXT NOT NULL DEFAULT 'apparel-standard',
    "status" TEXT NOT NULL DEFAULT 'RESEARCHING',
    "designArtifactId" TEXT,
    "designBrief" TEXT,
    "skuPlan" TEXT,
    "qikinkProductId" TEXT,
    "shopifyProductId" TEXT,
    "shopifyHandle" TEXT,
    "browserJobId" TEXT,
    "browserProof" TEXT,
    "blockedReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ProductLaunch_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "ProductLaunch_organizationId_code_key" ON "ProductLaunch"("organizationId", "code");
CREATE INDEX "ProductLaunch_organizationId_status_idx" ON "ProductLaunch"("organizationId", "status");
