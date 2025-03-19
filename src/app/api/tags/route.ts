import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { logger } from '@/lib/logger';

// Mark this route as dynamic to avoid static generation issues
export const dynamic = 'force-dynamic';

// GET /api/tags - Get all unique tags with file counts
export async function GET(request: NextRequest) {
  try {
    // Get search query parameter if any
    const searchParams = new URL(request.url).searchParams;
    const search = searchParams.get('search')?.trim() || '';
    
    // Build the where clause
    const whereClause: any = {};
    if (search) {
      whereClause.name = {
        contains: search,
        mode: 'insensitive',
      };
    }
    
    // Get all tags with file counts, sorted by usage (most used first)
    const tags = await prisma.tag.findMany({
      where: whereClause,
      include: {
        _count: {
          select: {
            files: true,
          }
        }
      },
      orderBy: {
        files: {
          _count: 'desc'
        }
      }
    });
    
    // Format the response
    const formattedTags = tags.map(tag => ({
      id: tag.id,
      name: tag.name,
      fileCount: tag._count.files
    }));
    
    return NextResponse.json({
      tags: formattedTags
    });
  } catch (error: any) {
    logger.error('Error fetching tags:', { error: error.message || 'Unknown error' });
    return NextResponse.json({ error: 'Failed to fetch tags' }, { status: 500 });
  }
} 