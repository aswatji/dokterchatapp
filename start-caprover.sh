#!/bin/bash
set -euo pipefail

echo "[caprover] Starting Chat Server..."

# Ensure production settings for CapRover container
export NODE_ENV=production
export PORT="${PORT:-80}"

mask_url() {
  local url="$1"
  echo "${url}" | sed 's#://[^:]*:\([^@]*\)@#://*****:*****@#'
}

if [ -z "${DATABASE_URL:-}" ]; then
  echo "[caprover] DATABASE_URL not provided. Attempting to construct it from POSTGRES_* variables."

  if [ -z "${POSTGRES_PASSWORD:-}" ]; then
    echo "[caprover] ERROR: POSTGRES_PASSWORD is required when DATABASE_URL is not set."
    exit 1
  fi

  PGHOST="${POSTGRES_HOST:-${CAPROVER_POSTGRES_HOST:-srv-captain--dokterchat}}"
  PGPORT="${POSTGRES_PORT:-5432}"
  PGUSER="${POSTGRES_USER:-postgres}"
  PGDATABASE="${POSTGRES_DB:-postgres}"

  export DATABASE_URL="postgresql://${PGUSER}:${POSTGRES_PASSWORD}@${PGHOST}:${PGPORT}/${PGDATABASE}"
  echo "[caprover] Constructed DATABASE_URL using host ${PGHOST}:${PGPORT} and database ${PGDATABASE}."
else
  echo "[caprover] DATABASE_URL provided via environment."
fi

echo "[caprover] Sanitized DATABASE_URL => $(mask_url "${DATABASE_URL}")"

echo "[caprover] Testing database connectivity..."
node <<'NODE'
const { Pool } = require('pg');

(async () => {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: false,
  });

  try {
    const result = await pool.query('SELECT NOW() as current_time, version() as pg_version');
    console.log('[caprover] Database connection successful');
    console.log('[caprover] Time:', result.rows[0].current_time);
    console.log('[caprover] PostgreSQL Version:', result.rows[0].pg_version.split(' ')[0]);
  } catch (error) {
    console.error('[caprover] Database connection failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
})();
NODE

echo "[caprover] Database connection verified."

echo "[caprover] Launching application on port ${PORT}..."
exec node index.js
