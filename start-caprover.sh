#!/bin/bash

echo "🚀 Starting Chat Server for CapRover deployment..."

# Set production environment
export NODE_ENV=production
export PORT=80

# Debug environment variables (safely)
echo "📋 Environment Check:"
echo "NODE_ENV: $NODE_ENV"
echo "PORT: $PORT"
echo "Database configured: $([ -n "$DATABASE_URL" ] && echo "YES" || echo "NO")"

# If no DATABASE_URL is set, try to construct from CapRover services
if [ -z "$DATABASE_URL" ]; then
    echo "⚠️ DATABASE_URL not found, checking CapRover database service..."
    if [ -n "$POSTGRES_PASSWORD" ] && [ -n "$POSTGRES_DB" ]; then
        export DATABASE_URL="postgresql://postgres:$POSTGRES_PASSWORD@srv-captain--dokterchat:5432/$POSTGRES_DB"
        echo "✅ Using CapRover internal database connection"
    else
        echo "❌ No database configuration found!"
        exit 1
    fi
fi

# Test database connection
echo "🔍 Testing database connection..."
node -e "
const { Pool } = require('pg');
const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL, 
  ssl: false 
});

pool.query('SELECT NOW() as current_time, version() as pg_version')
  .then(result => {
    console.log('✅ Database connection successful');
    console.log('Time:', result.rows[0].current_time);
    console.log('PostgreSQL Version:', result.rows[0].pg_version.split(' ')[1]);
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Database connection failed:', err.message);
    process.exit(1);
  });
"

if [ $? -ne 0 ]; then
    echo "❌ Database connection test failed"
    exit 1
fi

echo "✅ Database connection verified"

# Database tables will be automatically created by the application
echo "🗄️ Database tables will be auto-created on startup"

# Start the application
echo "🎯 Starting Chat Server on port $PORT..."
exec node index.js