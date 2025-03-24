import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Get all files
    const files = await prisma.file.findMany({
      select: {
        id: true,
        name: true,
        type: true,
        size: true,
        createdAt: true,
        tags: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    if (files.length === 0) {
      return NextResponse.json({ error: 'No files available' }, { status: 404 });
    }

    // Use crypto for better randomization
    const randomIndex = Math.floor(Math.random() * files.length);
    const randomFile = files[randomIndex];

    logger.info('Random file selection:', {
      totalFiles: files.length,
      selectedIndex: randomIndex,
      selectedFile: randomFile.name
    });

    return NextResponse.json({ file: randomFile });
  } catch (error: any) {
    logger.error('Error in random file handler:', { error: error.message || 'Unknown error' });
    return NextResponse.json({ error: 'Failed to fetch random file' }, { status: 500 });
  }
} 