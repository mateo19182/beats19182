import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { minioClient, BUCKET_NAME, generateImageObjectName } from '@/lib/minio';
import { Readable } from 'stream';
// @ts-ignore - Import sharp with a ts-ignore to prevent TS errors
import sharp from 'sharp';

// Maximum image size (5MB)
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

// Square thumbnail size
const THUMBNAIL_SIZE = 250;

// Allowed image types
const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
];

// Define a type for our file with imagePath
interface FileWithImage {
  id: string;
  name: string;
  imagePath?: string | null;
  [key: string]: any;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const fileId = params.id;
    logger.info(`File image upload request received for file ID: ${fileId}`);

    // Check authentication
    logger.debug('Checking authentication');
    const session = await getServerSession();
    if (!session || !session.user?.email) {
      logger.error('Unauthorized access attempt');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get the user from the database
    logger.debug(`Looking up user: ${session.user.email}`);
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      logger.error(`User not found: ${session.user.email}`);
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Fetch the file record
    logger.debug(`Fetching file record for ID: ${fileId}`);
    const fileRecord = await prisma.file.findUnique({
      where: {
        id: fileId,
      },
    }) as FileWithImage;

    if (!fileRecord) {
      logger.error(`File not found: ${fileId}`);
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }

    // Check if the user has access to this file
    if (fileRecord.userId !== user.id) {
      logger.error(`Unauthorized access to file: ${fileId}`);
      return NextResponse.json(
        { error: 'You do not have permission to modify this file' },
        { status: 403 }
      );
    }

    // Parse the form data
    logger.debug('Parsing form data');
    const formData = await request.formData();
    const uploadedImage = formData.get('image') as unknown as globalThis.File;

    // Validate image
    if (!uploadedImage) {
      logger.error('No image provided in request');
      return NextResponse.json(
        { error: 'No image provided' },
        { status: 400 }
      );
    }

    logger.info(`Image received`, {
      name: uploadedImage.name,
      size: `${(uploadedImage.size / (1024 * 1024)).toFixed(2)}MB`,
      type: uploadedImage.type,
    });

    // Check image size
    if (uploadedImage.size > MAX_IMAGE_SIZE) {
      logger.error(`Image too large`);
      return NextResponse.json(
        { error: 'Image size exceeds the limit (5MB)' },
        { status: 400 }
      );
    }

    // Check image type
    if (!ALLOWED_IMAGE_TYPES.includes(uploadedImage.type)) {
      logger.error(`Invalid image type: ${uploadedImage.type}`);
      return NextResponse.json(
        { error: 'Image type not allowed' },
        { status: 400 }
      );
    }

    // Convert image to buffer
    const buffer = Buffer.from(await uploadedImage.arrayBuffer());
    
    // Process image: resize to square thumbnail
    logger.debug(`Resizing image to ${THUMBNAIL_SIZE}x${THUMBNAIL_SIZE} square thumbnail`);
    const resizedImageBuffer = await sharp(buffer)
      .resize({
        width: THUMBNAIL_SIZE,
        height: THUMBNAIL_SIZE,
        fit: 'cover',
        position: 'center'
      })
      .toFormat('jpeg', { 
        quality: 90,  // Increased quality from 85 to 90
        progressive: true,
        optimizeScans: true
      })
      .toBuffer();
    
    // Generate a unique object name for the image
    const objectName = generateImageObjectName(user.id, fileId);
    const fullObjectName = `${objectName}.jpg`; // Always use jpg for processed images

    // Check if file has an existing image path
    if (fileRecord.imagePath) {
      try {
        logger.debug(`Removing previous image: ${fileRecord.imagePath}`);
        await minioClient.removeObject(BUCKET_NAME, fileRecord.imagePath);
      } catch (error) {
        logger.warn(`Failed to remove previous image`, { error });
        // Continue with the upload even if removal failed
      }
    }

    // Upload processed image to MinIO
    logger.debug(`Uploading resized image to MinIO: ${fullObjectName}`);
    const uploadStartTime = Date.now();
    await minioClient.putObject(BUCKET_NAME, fullObjectName, resizedImageBuffer, resizedImageBuffer.length, {
      'Content-Type': 'image/jpeg',
    });
    const uploadEndTime = Date.now();
    logger.success(`Image uploaded to MinIO successfully in ${uploadEndTime - uploadStartTime}ms`);

    // Update file record with image path
    const dbStartTime = Date.now();
    const updatedFile = await prisma.file.update({
      where: { id: fileId },
      data: {
        // @ts-ignore - We know this field exists in the database schema
        imagePath: fullObjectName,
      },
    }) as FileWithImage;
    const dbEndTime = Date.now();
    logger.success(`Database record updated in ${dbEndTime - dbStartTime}ms`);

    // Generate object URL for frontend
    const imageUrl = `/api/files/${fileId}/image`;

    return NextResponse.json({
      success: true,
      imagePath: imageUrl,
      file: {
        id: updatedFile.id,
        name: updatedFile.name,
        imagePath: imageUrl,
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`Image upload failed: ${errorMessage}`, { error });
    
    return NextResponse.json(
      { error: 'Failed to upload image' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const fileId = params.id;
    logger.debug(`File image request received for file ID: ${fileId}`);

    // Fetch the file record
    const fileRecord = await prisma.file.findUnique({
      where: {
        id: fileId,
      },
    }) as FileWithImage;

    if (!fileRecord || !fileRecord.imagePath) {
      logger.error(`Image not found for file: ${fileId}`);
      return NextResponse.json(
        { error: 'Image not found' },
        { status: 404 }
      );
    }

    try {
      // Get a readable stream from MinIO
      const imageStream = await minioClient.getObject(BUCKET_NAME, fileRecord.imagePath);
      
      // Determine content type based on file extension
      const extension = fileRecord.imagePath.split('.').pop()?.toLowerCase() || 'jpg';
      let contentType = 'image/jpeg'; // Default
      
      switch (extension) {
        case 'png':
          contentType = 'image/png';
          break;
        case 'gif':
          contentType = 'image/gif';
          break;
        case 'webp':
          contentType = 'image/webp';
          break;
        // Default is already set to image/jpeg
      }

      // Get the image buffer to ensure we have the full image
      const chunks: Buffer[] = [];
      for await (const chunk of imageStream) {
        chunks.push(Buffer.from(chunk));
      }
      const buffer = Buffer.concat(chunks);
      
      // Check if buffer has valid image data
      if (buffer.length === 0) {
        throw new Error('Image data is empty');
      }
      
      // Create a new response with appropriate headers
      const response = new Response(buffer);
      
      // Set content type header based on image type
      response.headers.set('Content-Type', contentType);
      response.headers.set('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
      
      return response;
    } catch (error: any) {
      logger.error('Error streaming image from MinIO:', { error: error.message || 'Unknown error' });
      return NextResponse.json({ error: 'Failed to stream image' }, { status: 500 });
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`Image retrieval failed: ${errorMessage}`, { error });
    
    return NextResponse.json(
      { error: 'Failed to retrieve image' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const fileId = params.id;
    logger.info(`File image deletion request received for file ID: ${fileId}`);

    // Check authentication
    logger.debug('Checking authentication');
    const session = await getServerSession();
    if (!session || !session.user?.email) {
      logger.error('Unauthorized access attempt');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get the user from the database
    logger.debug(`Looking up user: ${session.user.email}`);
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      logger.error(`User not found: ${session.user.email}`);
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Fetch the file record
    logger.debug(`Fetching file record for ID: ${fileId}`);
    const fileRecord = await prisma.file.findUnique({
      where: {
        id: fileId,
      },
    }) as FileWithImage;

    if (!fileRecord) {
      logger.error(`File not found: ${fileId}`);
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }

    // Check if the user has access to this file
    if (fileRecord.userId !== user.id) {
      logger.error(`Unauthorized access to file: ${fileId}`);
      return NextResponse.json(
        { error: 'You do not have permission to modify this file' },
        { status: 403 }
      );
    }

    // Check if file has an image
    if (!fileRecord.imagePath) {
      logger.error(`No image found for file: ${fileId}`);
      return NextResponse.json(
        { error: 'No image to delete' },
        { status: 404 }
      );
    }

    // Delete image from MinIO
    try {
      logger.debug(`Removing image from MinIO: ${fileRecord.imagePath}`);
      await minioClient.removeObject(BUCKET_NAME, fileRecord.imagePath);
    } catch (error) {
      logger.error(`Failed to remove image from MinIO: ${fileRecord.imagePath}`, { error });
      // Continue with the database update even if MinIO deletion failed
    }

    // Update file record to remove image path
    logger.debug(`Updating file record to remove image path`);
    const updatedFile = await prisma.file.update({
      where: { id: fileId },
      data: {
        // @ts-ignore - We know this field exists in the database schema
        imagePath: null,
      },
    });

    logger.success(`Image deleted successfully for file: ${fileId}`);

    return NextResponse.json({
      success: true,
      message: 'Image deleted successfully',
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`Image deletion failed: ${errorMessage}`, { error });
    
    return NextResponse.json(
      { error: 'Failed to delete image' },
      { status: 500 }
    );
  }
} 