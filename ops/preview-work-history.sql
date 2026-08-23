\set ON_ERROR_STOP on

SELECT
  o.id AS organization_id,
  o.name AS organization_name,
  (SELECT count(*) FROM "Issue" i WHERE i."organizationId" = o.id) AS issues,
  (SELECT count(*) FROM "Approval" a WHERE a."organizationId" = o.id) AS approvals
FROM "Organization" o
WHERE o.id = :'organization_id';

SELECT 'issue' AS record_type, status, count(*)
FROM "Issue"
WHERE "organizationId" = :'organization_id'
GROUP BY status
UNION ALL
SELECT 'approval' AS record_type, status, count(*)
FROM "Approval"
WHERE "organizationId" = :'organization_id'
GROUP BY status
ORDER BY record_type, status;
