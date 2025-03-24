import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { name: string } }
) {
  try {
    // Get files for this tag
    const files = await prisma.file.findMany({
      where: {
        tags: {
          some: {
            name: params.name,
          },
        },
      },
      include: {
        tags: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({
      tag: params.name,
      files,
    });
  } catch (error) {
    console.error('Error in tag files GET handler:', error);
    return NextResponse.json(
      { error: 'Failed to fetch files' },
      { status: 500 }
    );
  }
} 