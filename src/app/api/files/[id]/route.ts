import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { minioClient, BUCKET_NAME } from '@/lib/minio';
import { Readable } from 'stream';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const fileId = params.id;
    logger.info(`File request received for ID: ${fileId}`);

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
    });

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
        { error: 'You do not have permission to access this file' },
        { status: 403 }
      );
    }

    try {
      // Get the object from MinIO
      logger.debug(`Retrieving file from MinIO: ${fileRecord.path}`);
      const dataStream = await minioClient.getObject(BUCKET_NAME, fileRecord.path);
      
      // Convert the stream to a buffer
      const chunks: Buffer[] = [];
      for await (const chunk of dataStream) {
        chunks.push(chunk);
      }
      const fileBuffer = Buffer.concat(chunks);
      
      // Create response with appropriate headers
      const response = new NextResponse(fileBuffer);
      
      // Set content type based on file type
      response.headers.set('Content-Type', fileRecord.type);
      response.headers.set('Content-Disposition', `inline; filename="${fileRecord.name}"`);
      
      logger.success(`Successfully served file: ${fileRecord.name}`);
      
      return response;
    } catch (error) {
      logger.error(`File not found in MinIO: ${fileRecord.path}`);
      return NextResponse.json(
        { error: 'File not found in storage' },
        { status: 404 }
      );
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`Failed to serve file: ${errorMessage}`, { error });
    
    return NextResponse.json(
      { error: 'Failed to serve file' },
      { status: 500 }
    );
  }
} 