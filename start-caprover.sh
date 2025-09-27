#!/bin/bash
set -euo pipefail

echo "[caprover] Starting Chat Server..."

# Ensure production settings for CapRover container
export NODE_ENV=production
export PORT="${PORT:-3000}"

# Debug information
echo "[caprover] Environment Variables:"
echo "[caprover] NODE_ENV: $NODE_ENV"
echo "[caprover] PORT: $PORT"

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

# Test database connection with timeout
timeout 10s node -e "
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: false,
  connectionTimeoutMillis: 5000,
});

pool.query('SELECT version()')
  .then(res => {
    console.log('[caprover] Database connection successful');
    console.log('[caprover] PostgreSQL Version:', res.rows[0].version.split(' ')[0], res.rows[0].version.split(' ')[1]);
    process.exit(0);
  })
  .catch(err => {
    console.log('[caprover] Database connection failed:', err.message);
    console.log('[caprover] Will start server anyway...');
    process.exit(0);
  });
" || echo "[caprover] Database test completed (with timeout)"

echo "[caprover] Database connection test finished."

echo "[caprover] Launching application on port ${PORT}..."
echo "[caprover] Process ID: $$"
echo "[caprover] Current directory: $(pwd)"
echo "[caprover] Node.js version: $(node --version)"
echo "[caprover] NPM version: $(npm --version)"

# Check if index.js exists
if [ ! -f "index.js" ]; then
    echo "[caprover] ERROR: index.js not found!"
    ls -la
    exit 1
fi

echo "[caprover] Starting Node.js application..."
exec node index.js
