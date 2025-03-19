import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    logger.info('Files fetch request received');

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search') || '';
    const tagFilter = searchParams.get('tag') || '';
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    
    logger.debug(`Search params: search=${search}, tag=${tagFilter}, sortBy=${sortBy}, sortOrder=${sortOrder}`);

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

    // Build the where clause for filtering
    const whereClause: any = {
      userId: user.id,
    };

    // Add name search if provided
    if (search) {
      whereClause.name = {
        contains: search,
        mode: 'insensitive', // Case-insensitive search
      };
    }

    // Add tag filter if provided
    if (tagFilter) {
      whereClause.tags = {
        some: {
          name: tagFilter,
        },
      };
    }

    // Validate sort parameters
    const validSortFields = ['name', 'createdAt', 'size', 'type'];
    const validSortOrders = ['asc', 'desc'];
    
    const finalSortBy = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const finalSortOrder = validSortOrders.includes(sortOrder as any) ? sortOrder : 'desc';

    // Build the orderBy object
    const orderBy: any = {
      [finalSortBy]: finalSortOrder,
    };

    // Fetch files for the user with filters and sorting
    logger.debug(`Fetching files for user: ${user.id} with filters and sorting`);
    const files = await prisma.file.findMany({
      where: whereClause,
      include: {
        tags: true,
      },
      orderBy,
    });

    // Get all unique tags for the user (for the filter dropdown)
    const allTags = await prisma.tag.findMany({
      where: {
        files: {
          some: {
            userId: user.id,
          },
        },
      },
      distinct: ['name'],
      select: {
        id: true,
        name: true,
      },
    });

    logger.success(`Successfully fetched ${files.length} files`);

    return NextResponse.json({
      success: true,
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