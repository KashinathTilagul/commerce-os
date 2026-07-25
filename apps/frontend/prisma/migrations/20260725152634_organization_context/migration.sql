-- CreateTable
CREATE TABLE "OrganizationContext" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "companyProfile" TEXT NOT NULL DEFAULT '',
    "brandDna" TEXT NOT NULL DEFAULT '',
    "industry" TEXT NOT NULL DEFAULT '',
    "products" TEXT NOT NULL DEFAULT '',
    "toneOfVoice" TEXT NOT NULL DEFAULT '',
    "policies" TEXT NOT NULL DEFAULT '',
    "workflows" TEXT NOT NULL DEFAULT '',
    "goals" TEXT NOT NULL DEFAULT '',
    "preferences" TEXT NOT NULL DEFAULT '',
    "connectedSystems" TEXT NOT NULL DEFAULT '',
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "OrganizationContext_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationContext_organizationId_key" ON "OrganizationContext"("organizationId");
