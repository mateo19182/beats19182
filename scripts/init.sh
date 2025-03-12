#!/bin/bash

# Wait for PostgreSQL to be ready
while ! nc -z db 5432; do
  echo "Waiting for PostgreSQL to start..."
  sleep 1
done

# Wait for MinIO to be ready
while ! curl -s http://${MINIO_ENDPOINT:-minio}:${MINIO_PORT:-9000}/minio/health/live > /dev/null; do
  echo "Waiting for MinIO to start..."
  sleep 1
done

# Push the database schema
npx prisma db push

# Create admin user if not exists
if [ ! -z "$ADMIN_EMAIL" ] && [ ! -z "$ADMIN_PASSWORD" ]; then
  echo "Creating admin user..."
  npm run create-admin "$ADMIN_EMAIL" "$ADMIN_PASSWORD"
fi

# Initialize MinIO bucket
echo "Initializing MinIO bucket..."
npm run minio:init

# Start the application
npm run start 