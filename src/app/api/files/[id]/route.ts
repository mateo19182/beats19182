import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { minioClient, BUCKET_NAME } from '@/lib/minio';
import { Readable } from 'stream';

// GET /api/files/[id] - Get a specific file
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
    // Check if the request is for the file metadata
    const searchParams = new URL(request.url).searchParams;
    const metadataOnly = searchParams.get('metadata') === 'true';
    
    if (metadataOnly) {
      // Get the file metadata
      const file = await prisma.file.findUnique({
        where: { id },
        include: {
          tags: true,
        },
      });
      
      if (!file) {
        return NextResponse.json({ error: 'File not found' }, { status: 404 });
      }
      
      return NextResponse.json({ file });
    }
    
    // Otherwise, stream the file content
    // Get the file to determine the path in MinIO
    const file = await prisma.file.findUnique({
      where: { id },
      select: {
        path: true,
        type: true,
        name: true,
        size: true,
      },
    });
    
    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }
    
    try {
      // Get a readable stream from MinIO
      const fileStream = await minioClient.getObject(BUCKET_NAME, file.path);
      
      // Create a new response with appropriate headers
      const response = new Response(Readable.toWeb(fileStream) as ReadableStream);
      
      // Set content type header based on file type
      response.headers.set('Content-Type', file.type);
      response.headers.set('Content-Disposition', `inline; filename="${file.name}"`);
      
      return response;
    } catch (error: any) {
      logger.error('Error streaming file from MinIO:', { error: error.message || 'Unknown error' });
      return NextResponse.json({ error: 'Failed to stream file' }, { status: 500 });
    }
  } catch (error: any) {
    logger.error('Error in file GET handler:', { error: error.message || 'Unknown error' });
    return NextResponse.json({ error: 'Failed to process file request' }, { status: 500 });
  }
}

// Legacy GET handler removed to fix build issues 