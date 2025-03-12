import { logger } from './logger';
import { minioClient, BUCKET_NAME } from './minio';

// Initialize MinIO bucket with retry logic
async function initializeMinioBucket(retries = 5, delay = 2000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      logger.info(`Initializing MinIO bucket (attempt ${attempt}/${retries})...`);
      
      // Check if bucket exists
      const bucketExists = await minioClient.bucketExists(BUCKET_NAME);
      
      if (!bucketExists) {
        logger.info(`Creating bucket: ${BUCKET_NAME}`);
        await minioClient.makeBucket(BUCKET_NAME, process.env.MINIO_REGION || 'us-east-1');
        logger.success(`Bucket created: ${BUCKET_NAME}`);
        
        // Set bucket policy to allow public read access if needed
        if (process.env.MINIO_PUBLIC_READ === 'true') {
          const policy = {
            Version: '2012-10-17',
            Statement: [
              {
                Effect: 'Allow',
                Principal: { AWS: ['*'] },
                Action: ['s3:GetObject'],
                Resource: [`arn:aws:s3:::${BUCKET_NAME}/*`],
              },
            ],
          };
          
          await minioClient.setBucketPolicy(BUCKET_NAME, JSON.stringify(policy));
          logger.info(`Set public read policy for bucket: ${BUCKET_NAME}`);
        }
      } else {
        logger.info(`Bucket already exists: ${BUCKET_NAME}`);
      }
      
      // Verify bucket exists after creation
      const verifyBucketExists = await minioClient.bucketExists(BUCKET_NAME);
      if (!verifyBucketExists) {
        throw new Error('Bucket verification failed after creation');
      }
      
      logger.success('MinIO bucket initialization successful');
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`MinIO bucket initialization failed (attempt ${attempt}/${retries}): ${errorMessage}`, { error });
      
      if (attempt < retries) {
        logger.info(`Retrying in ${delay/1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        logger.error('Max retries reached. MinIO bucket initialization failed.');
        throw error;
      }
    }
  }
  return false;
}

// Initialize services
export async function initializeServices() {
  try {
    logger.info('Initializing services...');
    
    // Initialize MinIO bucket with retries
    await initializeMinioBucket();
    
    logger.success('Services initialized successfully');
    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`Failed to initialize services: ${errorMessage}`, { error });
    return false;
  }
}

// Call this function to initialize services
// This is exported so it can be called from anywhere
export default initializeServices; 