import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { minioClient, BUCKET_NAME } from '@/lib/minio';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const fileId = params.id;
    logger.info(`File deletion request received for ID: ${fileId}`);

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
        { error: 'You do not have permission to delete this file' },
        { status: 403 }
      );
    }

    try {
      // Delete the file from MinIO
      logger.debug(`Deleting file from MinIO: ${fileRecord.path}`);
      await minioClient.removeObject(BUCKET_NAME, fileRecord.path);
      logger.success(`File deleted from MinIO: ${fileRecord.path}`);
    } catch (error) {
      // Object doesn't exist in MinIO, just log it
      logger.warn(`File not found in MinIO or error removing: ${fileRecord.path}`);
    }

    // Delete the file record from the database
    logger.debug(`Deleting file record from database: ${fileId}`);
    await prisma.file.delete({
      where: {
        id: fileId,
      },
    });
    
    logger.success(`Successfully deleted file: ${fileRecord.name}`);
    
    return NextResponse.json({
      success: true,
      message: 'File deleted successfully',
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`Failed to delete file: ${errorMessage}`, { error });
    
    return NextResponse.json(
      { error: 'Failed to delete file' },
      { status: 500 }
    );
  }
} 