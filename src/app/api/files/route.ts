import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    logger.info('Files fetch request received');

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

    // Fetch all files for the user
    logger.debug(`Fetching files for user: ${user.id}`);
    const files = await prisma.file.findMany({
      where: {
        userId: user.id,
      },
      include: {
        tags: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    logger.success(`Successfully fetched ${files.length} files`);

    return NextResponse.json({
      success: true,
      files,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`Failed to fetch files: ${errorMessage}`, { error });
    
    return NextResponse.json(
      { error: 'Failed to fetch files' },
      { status: 500 }
    );
  }
} 