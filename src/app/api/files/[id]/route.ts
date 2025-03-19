import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { minioClient, BUCKET_NAME } from '@/lib/minio';

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
      // Get the file stat to get its size
      const stat = await minioClient.statObject(BUCKET_NAME, fileRecord.path);
      const fileSize = stat.size;
      
      // Parse Range header
      const rangeHeader = request.headers.get('range');
      
      if (!rangeHeader) {
        // No range requested, serve the full file
        logger.debug(`Retrieving full file from MinIO: ${fileRecord.path}`);
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
        response.headers.set('Content-Length', fileSize.toString());
        response.headers.set('Accept-Ranges', 'bytes');
        
        logger.success(`Successfully served full file: ${fileRecord.name}`);
        
        return response;
      } else {
        // Range request
        const range = rangeHeader.replace(/bytes=/, '').split('-');
        const start = parseInt(range[0], 10);
        const end = range[1] ? parseInt(range[1], 10) : fileSize - 1;
        
        if (isNaN(start) || start < 0) {
          logger.error(`Invalid range request for file: ${fileId}`);
          return NextResponse.json(
            { error: 'Invalid range request' },
            { status: 416 }
          );
        }
        
        const validEnd = Math.min(end, fileSize - 1);
        const chunkSize = validEnd - start + 1;
        
        // MinIO getPartialObject takes inclusive range
        logger.debug(`Retrieving partial file from MinIO: ${fileRecord.path}, range: ${start}-${validEnd}`);
        const dataStream = await minioClient.getPartialObject(BUCKET_NAME, fileRecord.path, start, validEnd);
        
        // Convert the stream to a buffer
        const chunks: Buffer[] = [];
        for await (const chunk of dataStream) {
          chunks.push(chunk);
        }
        const fileBuffer = Buffer.concat(chunks);
        
        // Create response with appropriate headers for partial content
        const response = new NextResponse(fileBuffer, {
          status: 206 // Partial Content
        });
        
        response.headers.set('Content-Type', fileRecord.type);
        response.headers.set('Content-Range', `bytes ${start}-${validEnd}/${fileSize}`);
        response.headers.set('Content-Length', chunkSize.toString());
        response.headers.set('Accept-Ranges', 'bytes');
        response.headers.set('Content-Disposition', `inline; filename="${fileRecord.name}"`);
        
        logger.success(`Successfully served partial file: ${fileRecord.name}, range: ${start}-${validEnd}`);
        
        return response;
      }
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