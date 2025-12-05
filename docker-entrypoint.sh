#!/bin/sh
set -e

echo "Checking database..."

# Run Prisma DB push to initialize/update database schema
npx prisma db push

echo "Database ready!"

# Start the Next.js server
exec node server.js
