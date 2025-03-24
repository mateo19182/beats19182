import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { minioClient, BUCKET_NAME } from '@/lib/minio';
import { Readable } from 'stream';

export const dynamic = 'force-dynamic';

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
    const version = searchParams.get('version');
    
    if (metadataOnly) {
      // Get the file metadata with versions
      const file = await prisma.file.findUnique({
        where: { id },
        include: {
          tags: true,
          versions: {
            orderBy: {
              version: 'desc',
            },
          },
        },
      });
      
      if (!file) {
        return NextResponse.json({ error: 'File not found' }, { status: 404 });
      }
      
      return NextResponse.json({ file });
    }
    
    // Get the file with version information if specified
    const file = await prisma.file.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        path: true,
        type: true,
        size: true,
        versions: version ? {
          where: {
            version: parseInt(version),
          },
          select: {
            path: true,
          },
        } : undefined,
      },
    });
    
    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // If version is specified, use that version's path
    const filePath = version && file.versions?.[0]?.path
      ? file.versions[0].path // Use the specified version's path
      : file.path; // Use the current version's path

    if (!filePath) {
      return NextResponse.json({ error: 'Version not found' }, { status: 404 });
    }
    
    try {
      // Get a readable stream from MinIO
      const fileStream = await minioClient.getObject(BUCKET_NAME, filePath);
      
      // Create a new response with appropriate headers
      const response = new Response(Readable.toWeb(fileStream) as ReadableStream);
      
      // Set content type header based on file type
      response.headers.set('Content-Type', file.type);
      response.headers.set('Content-Disposition', `attachment; filename="${file.name}"`);
      
      // Add cache headers for browser caching
      response.headers.set('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
      response.headers.set('ETag', `"${file.id}-${version || 'latest'}"`); // Use file ID and version as ETag
      
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

// PATCH /api/files/[id] - Update file metadata
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const { name, tags } = await request.json();
    
    // Get the current file
    const file = await prisma.file.findUnique({
      where: { id },
      include: {
        user: true,
      },
    });
    
    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }
    
    // Update the file name and tags
    const updatedFile = await prisma.file.update({
      where: { id },
      data: {
        ...(name && { name }), // Only update name if provided
        ...(tags && {
          tags: {
            set: [], // Clear existing tags
            connectOrCreate: tags.map((tag: string) => ({
              where: { name: tag },
              create: { name: tag },
            })),
          },
        }),
      },
      include: {
        tags: true,
      },
    });
    
    logger.info('Updated file metadata', { fileId: id, name, tags });
    
    return NextResponse.json({
      message: 'File updated successfully',
      file: updatedFile,
    });
  } catch (error: any) {
    logger.error('Error updating file:', { error: error.message || 'Unknown error' });
    return NextResponse.json({ error: 'Failed to update file' }, { status: 500 });
  }
}

// Legacy GET handler removed to fix build issues 