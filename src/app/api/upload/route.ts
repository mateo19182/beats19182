import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';

// Maximum file size (100MB)
const MAX_FILE_SIZE = 100 * 1024 * 1024;

// Allowed file types
const ALLOWED_FILE_TYPES = [
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/ogg',
  'audio/flac',
  'audio/aac',
  'audio/x-m4a',
];

export async function POST(request: NextRequest) {
  try {
    const startTime = Date.now();
    logger.info('Upload request received');

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

    // Parse the form data
    logger.debug('Parsing form data');
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const tags = formData.getAll('tags') as string[];

    // Validate file
    if (!file) {
      logger.error('No file provided in request');
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    const fileInfo = {
      name: file.name,
      size: `${(file.size / (1024 * 1024)).toFixed(2)}MB`,
      type: file.type,
    };
    logger.info(`File received`, fileInfo);

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      logger.error(`File too large`, fileInfo);
      return NextResponse.json(
        { error: 'File size exceeds the limit (100MB)' },
        { status: 400 }
      );
    }

    // Check file type
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      logger.error(`Invalid file type: ${file.type}`);
      return NextResponse.json(
        { error: 'File type not allowed' },
        { status: 400 }
      );
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = join(process.cwd(), 'uploads', user.id);
    logger.debug(`Ensuring upload directory exists: ${uploadsDir}`);
    await mkdir(uploadsDir, { recursive: true });

    // Generate a unique filename
    const fileExtension = file.name.split('.').pop();
    const fileName = `${uuidv4()}.${fileExtension}`;
    const filePath = join(uploadsDir, fileName);
    logger.debug(`Generated unique filename: ${fileName}`);

    // Convert the file to a Buffer and save it
    logger.debug('Converting file to buffer');
    const buffer = Buffer.from(await file.arrayBuffer());
    
    logger.debug(`Writing file to disk: ${filePath}`);
    const writeStartTime = Date.now();
    await writeFile(filePath, buffer);
    const writeEndTime = Date.now();
    logger.success(`File written successfully in ${writeEndTime - writeStartTime}ms`);

    // Create file record in the database
    logger.debug('Creating database record', { tags });
    const dbStartTime = Date.now();
    const fileRecord = await prisma.file.create({
      data: {
        name: file.name,
        path: `uploads/${user.id}/${fileName}`,
        type: file.type,
        size: file.size,
        userId: user.id,
        tags: {
          connectOrCreate: tags.map(tag => ({
            where: { name: tag },
            create: { name: tag },
          })),
        },
      },
    });
    const dbEndTime = Date.now();
    logger.success(`Database record created in ${dbEndTime - dbStartTime}ms`);

    const endTime = Date.now();
    logger.success(`Upload completed in ${endTime - startTime}ms`, {
      fileId: fileRecord.id,
      fileName: fileRecord.name,
      processingTime: endTime - startTime
    });

    return NextResponse.json({
      success: true,
      file: {
        id: fileRecord.id,
        name: fileRecord.name,
        type: fileRecord.type,
        size: fileRecord.size,
        processingTime: endTime - startTime
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`Upload failed: ${errorMessage}`, { error });
    
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    );
  }
} 