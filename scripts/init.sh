#!/bin/bash

# Wait for PostgreSQL to be ready
while ! nc -z db 5432; do
  echo "Waiting for PostgreSQL to start..."
  sleep 1
done

# Push the database schema
npx prisma db push

# Create admin user if not exists
if [ ! -z "$ADMIN_EMAIL" ] && [ ! -z "$ADMIN_PASSWORD" ]; then
  echo "Creating admin user..."
  npm run create-admin "$ADMIN_EMAIL" "$ADMIN_PASSWORD"
fi

# Start the application
npm run start 