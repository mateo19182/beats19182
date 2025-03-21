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

// Helper function to generate a unique object name with version support
export function generateObjectName(userId: string, fileName: string, version: number): string {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 10);
  const extension = fileName.split('.').pop();
  
  return `${userId}/${fileName.replace(`.${extension}`, '')}/v${version}-${timestamp}-${randomString}.${extension}`;
}

// Helper function to extract the original filename from a versioned path
export function getOriginalFilename(path: string): string {
  const parts = path.split('/');
  if (parts.length < 3) return path;
  
  const filenameParts = parts[2].split('-');
  const extension = filenameParts[filenameParts.length - 1];
  return `${parts[1]}.${extension}`;
}

// Helper function to check if a file exists for a user
export async function checkFileExists(userId: string, fileName: string): Promise<boolean> {
  try {
    const objects = await minioClient.listObjects(BUCKET_NAME, `${userId}/${fileName.split('.')[0]}/`, true);
    let exists = false;
    
    for await (const obj of objects) {
      const item = obj as Minio.BucketItem;
      if (item.name) {
        exists = true;
        break;
      }
    }
    
    return exists;
  } catch (error: any) {
    logger.error('Error checking file existence:', { message: error.message || 'Unknown error' });
    return false;
  }
}

// Helper function to get the latest version number for a file
export async function getLatestVersion(userId: string, fileName: string): Promise<number> {
  try {
    const objects = await minioClient.listObjects(BUCKET_NAME, `${userId}/${fileName.split('.')[0]}/`, true);
    let maxVersion = 0;
    
    for await (const obj of objects) {
      const item = obj as Minio.BucketItem;
      if (item.name) {
        const versionMatch = item.name.match(/v(\d+)-/);
        if (versionMatch) {
          const version = parseInt(versionMatch[1]);
          maxVersion = Math.max(maxVersion, version);
        }
      }
    }
    
    return maxVersion;
  } catch (error: any) {
    logger.error('Error getting latest version:', { message: error.message || 'Unknown error' });
    return 0;
  }
} 