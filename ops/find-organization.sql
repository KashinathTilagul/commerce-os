\set ON_ERROR_STOP on

SELECT id
FROM "Organization"
WHERE id = :'target'
   OR lower(COALESCE(slug, '')) = lower(:'target')
   OR lower(name) = lower(:'target');
