-- CreateTable
CREATE TABLE "CommerceObjectLink" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "internalId" TEXT NOT NULL,
    "checksum" TEXT,
    "syncedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CommerceObjectLink_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SyncState" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "lastSuccessfulSync" DATETIME,
    "lastAttempt" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'IDLE',
    "recordsProcessed" INTEGER NOT NULL DEFAULT 0,
    "recordsFailed" INTEGER NOT NULL DEFAULT 0,
    "duration" INTEGER NOT NULL DEFAULT 0,
    "cursor" TEXT,
    "error" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SyncState_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ContextEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "handle" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT '',
    "summary" TEXT NOT NULL,
    "fullData" TEXT,
    "metadata" TEXT,
    "linkedBusinessObject" TEXT,
    "ttl" INTEGER NOT NULL DEFAULT 3600,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ContextEntry_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ContextEntry" ("createdAt", "fullData", "handle", "id", "metadata", "organizationId", "source", "summary", "ttl") SELECT "createdAt", "fullData", "handle", "id", "metadata", "organizationId", "source", "summary", "ttl" FROM "ContextEntry";
DROP TABLE "ContextEntry";
ALTER TABLE "new_ContextEntry" RENAME TO "ContextEntry";
CREATE INDEX "ContextEntry_organizationId_idx" ON "ContextEntry"("organizationId");
CREATE UNIQUE INDEX "ContextEntry_organizationId_handle_key" ON "ContextEntry"("organizationId", "handle");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "CommerceObjectLink_organizationId_internalId_idx" ON "CommerceObjectLink"("organizationId", "internalId");

-- CreateIndex
CREATE UNIQUE INDEX "CommerceObjectLink_organizationId_provider_entityType_externalId_key" ON "CommerceObjectLink"("organizationId", "provider", "entityType", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "SyncState_organizationId_provider_entity_key" ON "SyncState"("organizationId", "provider", "entity");
