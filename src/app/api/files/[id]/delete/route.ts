import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { join } from 'path';
import { unlink } from 'fs/promises';
import { stat } from 'fs/promises';

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

    // Get the file path
    const filePath = join(process.cwd(), fileRecord.path);
    
    try {
      // Check if file exists on disk
      await stat(filePath);
      
      // Delete the file from disk
      logger.debug(`Deleting file from disk: ${filePath}`);
      await unlink(filePath);
      logger.success(`File deleted from disk: ${filePath}`);
    } catch (error) {
      // File doesn't exist on disk, just log it
      logger.warn(`File not found on disk: ${filePath}`);
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