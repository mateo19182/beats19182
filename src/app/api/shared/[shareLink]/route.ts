import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET /api/shared/[shareLink] - Get a publicly shared pack by its shareLink
export async function GET(
  request: NextRequest,
  { params }: { params: { shareLink: string } }
) {
  try {
    const { shareLink } = params;
    
    // Get the pack by shareLink
    const pack = await prisma.pack.findFirst({
      where: { shareLink },
      include: {
        files: {
          select: {
            id: true,
            name: true,
            type: true,
            size: true,
            createdAt: true,
            tags: true,
          },
        },
      },
    });
    
    if (!pack) {
      return NextResponse.json({ error: 'Pack not found' }, { status: 404 });
    }
    
    return NextResponse.json({ pack });
  } catch (error) {
    console.error('Error fetching shared pack:', error);
    return NextResponse.json({ error: 'Failed to fetch shared pack' }, { status: 500 });
  }
} 