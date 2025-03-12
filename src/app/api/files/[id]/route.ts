import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { join } from 'path';
import { readFile } from 'fs/promises';
import { stat } from 'fs/promises';

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

    // Get the file path
    const filePath = join(process.cwd(), fileRecord.path);
    
    try {
      // Check if file exists
      await stat(filePath);
    } catch (error) {
      logger.error(`File not found on disk: ${filePath}`);
      return NextResponse.json(
        { error: 'File not found on disk' },
        { status: 404 }
      );
    }

    // Read the file
    logger.debug(`Reading file from disk: ${filePath}`);
    const fileBuffer = await readFile(filePath);
    
    // Create response with appropriate headers
    const response = new NextResponse(fileBuffer);
    
    // Set content type based on file type
    response.headers.set('Content-Type', fileRecord.type);
    response.headers.set('Content-Disposition', `inline; filename="${fileRecord.name}"`);
    
    logger.success(`Successfully served file: ${fileRecord.name}`);
    
    return response;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`Failed to serve file: ${errorMessage}`, { error });
    
    return NextResponse.json(
      { error: 'Failed to serve file' },
      { status: 500 }
    );
  }
} 