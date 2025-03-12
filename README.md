# Beats19182 - Audio File Manager

## Overview
This application is a self-hosted platform for managing and sharing audio files with a structured tagging system. It allows users to upload files, organize them with tags, and create packs for easy sharing. The entire system runs on a local server without reliance on cloud services.

## Features

### File Management
- Users can upload various file types and store them securely using MinIO (S3-compatible object storage).
- File metadata (name, type, size, etc.) is stored in a PostgreSQL database.
- Secure access controls ensure only authorized users can manage files.

### Tagging System
- Users can create and assign multiple tags to files.
- Tag-based filtering and search enable quick retrieval of relevant files.
- Smart suggestions for frequently used tags improve organization.

### Pack Creation & Sharing
- Users can group multiple files into "packs."
- Packs can be shared with unique links.
- Configurable permissions (e.g., view-only, download access) for shared packs.

### Authentication & Security
- JWT-based authentication via NextAuth.js.
- Secure file handling with validation and sanitization.

### User Interface
- Built with Next.js and shadcn/ui for a clean, modern UX.
- Drag-and-drop file uploads for convenience.
- Dynamic search and filtering for efficient navigation.

### Performance & Scalability
- Uses PostgreSQL with indexing for fast queries.
- Caching strategies for frequently accessed files and metadata.
- Nginx as a reverse proxy to handle efficient file serving.

## Tech Stack
- **Frontend:** Next.js (App Router), Tailwind CSS, shadcn/ui
- **Backend:** Next.js API routes (or Node.js/Express if needed)
- **Database:** PostgreSQL (via Prisma ORM)
- **Storage:** MinIO (S3-compatible object storage)
- **Auth:** NextAuth.js (JWT-based authentication)
- **Reverse Proxy:** Nginx
- **Deployment:** Self-hosted on an Ubuntu server

## Setup and Configuration

### MinIO Configuration
The application uses MinIO for object storage. You can configure it using the following environment variables:

```
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_USE_SSL=false
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=beats-audio
MINIO_REGION=us-east-1
MINIO_PUBLIC_READ=false
```

When running with Docker Compose, a MinIO instance is automatically set up and configured.

## Future Enhancements
- Advanced search with full-text indexing.
- User activity logging and version control.
- Background jobs for handling large file processing.
- API for external integrations.

This application is designed for those who want a **powerful, self-hosted alternative to OffTop** with full control over their data. 🚀

