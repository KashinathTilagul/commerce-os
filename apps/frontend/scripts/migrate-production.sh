#!/bin/sh
set -eu

cd /migration

prisma() {
  node node_modules/prisma/build/index.js "$@"
}

schema_matches_database() {
  set +e
  prisma migrate diff \
    --from-config-datasource \
    --to-schema prisma/schema.prisma \
    --exit-code >/tmp/prisma-schema-diff.txt 2>&1
  status=$?
  set -e

  if [ "$status" -eq 0 ]; then
    return 0
  fi
  if [ "$status" -eq 2 ]; then
    return 1
  fi

  cat /tmp/prisma-schema-diff.txt >&2
  echo "[migration] Could not compare the production schema." >&2
  exit "$status"
}

migration_state="$({
  node <<'NODE'
const { Client } = require('pg')

async function main() {
  const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL
  if (!connectionString) throw new Error('DIRECT_URL or DATABASE_URL is required')
  const client = new Client({ connectionString })
  await client.connect()
  const result = await client.query("SELECT to_regclass('public._prisma_migrations') IS NOT NULL AS exists")
  if (!result.rows[0]?.exists) {
    await client.end()
    process.stdout.write('__NO_TABLE__')
    return
  }
  const migrations = await client.query(
    'SELECT migration_name FROM "_prisma_migrations" WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL ORDER BY migration_name'
  )
  await client.end()
  process.stdout.write(migrations.rows.map((row) => row.migration_name).join('\n'))
}

main().catch((error) => {
  console.error(error.message)
  process.exit(1)
})
NODE
} 2>&1)" || {
  echo "$migration_state" >&2
  exit 1
}

if schema_matches_database; then
  echo "[migration] Schema already matches; reconciling migration history."
  for directory in prisma/migrations/[0-9]*; do
    [ -d "$directory" ] || continue
    migration_name="$(basename "$directory")"
    if [ "$migration_state" = "__NO_TABLE__" ] || ! printf '%s\n' "$migration_state" | grep -Fxq "$migration_name"; then
      prisma migrate resolve --applied "$migration_name"
    fi
  done
elif [ "$migration_state" = "__NO_TABLE__" ]; then
    cat /tmp/prisma-schema-diff.txt >&2
    echo "[migration] Existing database has no migration history and does not match the checked-in schema. Refusing to baseline or mutate it." >&2
    exit 1
fi

prisma migrate deploy

if ! schema_matches_database; then
  cat /tmp/prisma-schema-diff.txt >&2
  echo "[migration] Schema drift remains after migrate deploy; refusing application startup." >&2
  exit 1
fi

echo "[migration] Production schema is current."
