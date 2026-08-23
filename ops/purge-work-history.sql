\set ON_ERROR_STOP on

BEGIN;

CREATE TEMP TABLE purge_issues ON COMMIT DROP AS
SELECT id FROM "Issue" WHERE "organizationId" = :'organization_id';

CREATE TEMP TABLE purge_approvals ON COMMIT DROP AS
SELECT id FROM "Approval" WHERE "organizationId" = :'organization_id';

UPDATE "AgentRun"
SET "issueId" = NULL
WHERE "organizationId" = :'organization_id'
  AND "issueId" IN (SELECT id FROM purge_issues);

UPDATE "AgentRun"
SET "triggerRef" = NULL
WHERE "organizationId" = :'organization_id'
  AND "triggerRef" IN (
    SELECT id FROM purge_issues
    UNION ALL
    SELECT id FROM purge_approvals
  );

DELETE FROM "Approval"
WHERE "organizationId" = :'organization_id';

DELETE FROM "Issue"
WHERE "organizationId" = :'organization_id';

COMMIT;

SELECT
  (SELECT count(*) FROM "Issue" WHERE "organizationId" = :'organization_id') AS issues_remaining,
  (SELECT count(*) FROM "Approval" WHERE "organizationId" = :'organization_id') AS approvals_remaining;
