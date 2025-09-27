#!/bin/bash

echo "=== CapRover Debug Script ==="
echo "Date: $(date)"
echo "User: $(whoami)"
echo "PWD: $(pwd)"
echo "Node: $(node --version)"
echo "NPM: $(npm --version)"

echo ""
echo "=== Environment Variables ==="
echo "NODE_ENV: $NODE_ENV"
echo "PORT: $PORT"
echo "DATABASE_URL: ${DATABASE_URL:0:30}..."

echo ""
echo "=== File Check ==="
ls -la index.js package.json start-caprover.sh

echo ""
echo "=== Directory Contents ==="
ls -la

echo ""
echo "=== Network Check ==="
netstat -tlnp | grep :3000 || echo "Port 3000 not in use"

echo ""
echo "=== Memory Check ==="
free -h

echo ""
echo "=== Process Check ==="
ps aux | grep node | head -5

echo "=== Debug Complete ==="