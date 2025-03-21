import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    logger.info('Files fetch request received');

    // Check authentication
    const session = await getServerSession();
    if (!session?.user?.email) {
      logger.error('Unauthorized access attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      logger.error(`User not found: ${session.user.email}`);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get search parameters
    const searchParams = new URL(request.url).searchParams;
    const searchQuery = searchParams.get('search') || '';
    const tag = searchParams.get('tag');
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    logger.debug(`Search params: search=${searchQuery}, tag=${tag}, sortBy=${sortBy}, sortOrder=${sortOrder}`);

    // Get files with search, filter, and sort parameters
    const files = await prisma.file.findMany({
      where: {
        userId: user.id,
        ...(searchQuery && {
          name: {
            contains: searchQuery,
            mode: 'insensitive',
          },
        }),
        ...(tag && {
          tags: {
            some: {
              name: tag,
            },
          },
        }),
      },
      orderBy: {
        [sortBy]: sortOrder,
      },
      include: {
        tags: true,
      },
    });

    // Get all unique tags
    const allTags = await prisma.tag.findMany({
      where: {
        files: {
          some: {
            userId: user.id,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    logger.success(`Successfully fetched ${files.length} files`);

    return NextResponse.json({
      files,
      tags: allTags,
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