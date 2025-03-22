import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { Prisma } from '@prisma/client';

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
    
    // Pagination parameters
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    logger.debug(`Search params: search=${searchQuery}, tag=${tag}, sortBy=${sortBy}, sortOrder=${sortOrder}, page=${page}, limit=${limit}`);

    // Create where clause for both count and query
    const whereClause: Prisma.FileWhereInput = {
      userId: user.id,
      ...(searchQuery && {
        name: {
          contains: searchQuery,
          mode: 'insensitive' as Prisma.QueryMode,
        },
      }),
      ...(tag && {
        tags: {
          some: {
            name: tag,
          },
        },
      }),
    };

    // Get total count first
    const totalItems = await prisma.file.count({
      where: whereClause
    });

    // Calculate total pages
    const totalPages = Math.ceil(totalItems / limit);

    // Get files with search, filter, sort, and pagination parameters
    const files = await prisma.file.findMany({
      where: whereClause,
      orderBy: {
        [sortBy]: sortOrder,
      },
      include: {
        tags: true,
      },
      skip,
      take: limit,
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

    logger.success(`Successfully fetched ${files.length} files (page ${page} of ${totalPages})`);

    return NextResponse.json({
      files,
      tags: allTags,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems,
        itemsPerPage: limit
      }
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