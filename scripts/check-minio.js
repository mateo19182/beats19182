#!/usr/bin/env node

const Minio = require('minio');
const { promisify } = require('util');
const sleep = promisify(setTimeout);

// MinIO client configuration
const minioClient = new Minio.Client({
  endPoint: process.env.MINIO_ENDPOINT || 'localhost',
  port: parseInt(process.env.MINIO_PORT || '9000'),
  useSSL: process.env.MINIO_USE_SSL === 'true',
  accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
  secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
});

// Default bucket name
const BUCKET_NAME = process.env.MINIO_BUCKET || 'beats-audio';

// Initialize MinIO bucket with retry logic
async function initializeMinioBucket(retries = 5, delay = 2000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`Initializing MinIO bucket (attempt ${attempt}/${retries})...`);
      
      // Check if bucket exists
      const bucketExists = await minioClient.bucketExists(BUCKET_NAME);
      
      if (!bucketExists) {
        console.log(`Creating bucket: ${BUCKET_NAME}`);
        await minioClient.makeBucket(BUCKET_NAME, process.env.MINIO_REGION || 'us-east-1');
        console.log(`Bucket created: ${BUCKET_NAME}`);
        
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
          console.log(`Set public read policy for bucket: ${BUCKET_NAME}`);
        }
      } else {
        console.log(`Bucket already exists: ${BUCKET_NAME}`);
      }
      
      // Verify bucket exists after creation
      const verifyBucketExists = await minioClient.bucketExists(BUCKET_NAME);
      if (!verifyBucketExists) {
        throw new Error('Bucket verification failed after creation');
      }
      
      console.log('MinIO bucket initialization successful');
      return true;
    } catch (error) {
      console.error(`MinIO bucket initialization failed (attempt ${attempt}/${retries}):`, error);
      
      if (attempt < retries) {
        console.log(`Retrying in ${delay/1000} seconds...`);
        await sleep(delay);
      } else {
        console.error('Max retries reached. MinIO bucket initialization failed.');
        process.exit(1);
      }
    }
  }
  return false;
}

// Run the initialization
initializeMinioBucket()
  .then(() => {
    console.log('MinIO bucket check completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('Error initializing MinIO bucket:', error);
    process.exit(1);
  }); 