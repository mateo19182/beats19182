import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { logger } from '@/lib/logger';
import initializeServices from '@/lib/init';

// This endpoint is used to initialize MinIO
// It can be called manually or automatically when needed
export async function GET(request: NextRequest) {
  try {
    logger.info('MinIO initialization request received');

    // Check authentication for admin access
    logger.debug('Checking authentication');
    const session = await getServerSession();
    if (!session || !session.user?.email) {
      logger.error('Unauthorized access attempt');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Initialize services (including MinIO)
    logger.info('Initializing services...');
    const success = await initializeServices();
    
    if (success) {
      logger.success('MinIO initialization successful');
      return NextResponse.json({
        success: true,
        message: 'MinIO initialized successfully',
      });
    } else {
      logger.error('MinIO initialization failed');
      return NextResponse.json(
        { error: 'Failed to initialize MinIO' },
        { status: 500 }
      );
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`MinIO initialization failed: ${errorMessage}`, { error });
    
    return NextResponse.json(
      { error: 'Failed to initialize MinIO' },
      { status: 500 }
    );
  }
} 