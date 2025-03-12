import * as Minio from 'minio';
import { logger } from './logger';

// MinIO client configuration
export const minioClient = new Minio.Client({
  endPoint: process.env.MINIO_ENDPOINT || 'localhost',
  port: parseInt(process.env.MINIO_PORT || '9000'),
  useSSL: process.env.MINIO_USE_SSL === 'true',
  accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
  secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
});

// Default bucket name
export const BUCKET_NAME = process.env.MINIO_BUCKET || 'beats-audio';

// Helper function to generate a unique object name
export function generateObjectName(userId: string, fileName: string): string {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 10);
  const extension = fileName.split('.').pop();
  
  return `${userId}/${timestamp}-${randomString}.${extension}`;
} 