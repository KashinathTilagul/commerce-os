-- CreateTable
CREATE TABLE "KnowledgeNode" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "metadata" TEXT,
    "businessObjectType" TEXT NOT NULL,
    "businessObjectId" TEXT NOT NULL,
    "checksum" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "sourceProvider" TEXT NOT NULL,
    "confidence" TEXT NOT NULL,
    "embeddingStatus" TEXT NOT NULL DEFAULT 'NOT_INDEXED',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "KnowledgeNode_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "KnowledgeEdge" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "KnowledgeEdge_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "KnowledgeEdge_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "KnowledgeNode" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "KnowledgeEdge_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "KnowledgeNode" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "KnowledgeNode_organizationId_type_idx" ON "KnowledgeNode"("organizationId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "KnowledgeNode_organizationId_businessObjectType_businessObjectId_key" ON "KnowledgeNode"("organizationId", "businessObjectType", "businessObjectId");

-- CreateIndex
CREATE INDEX "KnowledgeEdge_sourceId_idx" ON "KnowledgeEdge"("sourceId");

-- CreateIndex
CREATE INDEX "KnowledgeEdge_targetId_idx" ON "KnowledgeEdge"("targetId");

-- CreateIndex
CREATE UNIQUE INDEX "KnowledgeEdge_organizationId_sourceId_targetId_type_key" ON "KnowledgeEdge"("organizationId", "sourceId", "targetId", "type");
