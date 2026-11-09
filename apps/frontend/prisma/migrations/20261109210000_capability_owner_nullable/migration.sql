-- Capability.ownerId is optional in the Prisma schema (system capabilities have no agent).
-- The initial migration created it NOT NULL. Postgres allows a nullable foreign key.
ALTER TABLE "Capability" ALTER COLUMN "ownerId" DROP NOT NULL;
