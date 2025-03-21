import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { minioClient, BUCKET_NAME, generateObjectName } from '@/lib/minio';

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

    // Check if a file with the same name exists
    const existingFile = await prisma.file.findFirst({
      where: {
        userId: user.id,
        name: file.name,
      },
      include: {
        versions: {
          orderBy: {
            version: 'desc',
          },
          take: 1,
        },
      },
    });

    let fileRecord;
    const buffer = Buffer.from(await file.arrayBuffer());
    
    if (existingFile) {
      // File exists, create new version
      const newVersion = existingFile.currentVersion + 1;
      const objectName = generateObjectName(user.id, file.name, newVersion);

      // Upload new version to MinIO
      logger.debug(`Uploading new version to MinIO: ${objectName}`);
      const uploadStartTime = Date.now();
      await minioClient.putObject(BUCKET_NAME, objectName, buffer, buffer.length, {
        'Content-Type': file.type,
      });
      const uploadEndTime = Date.now();
      logger.success(`File version uploaded to MinIO successfully in ${uploadEndTime - uploadStartTime}ms`);

      // Create version record and update file
      const dbStartTime = Date.now();
      const [newVersionRecord, updatedFile] = await prisma.$transaction([
        prisma.fileVersion.create({
          data: {
            version: newVersion,
            path: objectName,
            size: file.size,
            fileId: existingFile.id,
          },
        }),
        prisma.file.update({
          where: { id: existingFile.id },
          data: {
            currentVersion: newVersion,
            path: objectName,
            size: file.size,
            tags: {
              connectOrCreate: tags.map(tag => ({
                where: { name: tag },
                create: { name: tag },
              })),
            },
          },
          include: {
            versions: {
              orderBy: {
                version: 'desc',
              },
            },
          },
        }),
      ]);

      fileRecord = updatedFile;
      const dbEndTime = Date.now();
      logger.success(`Database records updated in ${dbEndTime - dbStartTime}ms`);
    } else {
      // New file, create first version
      const objectName = generateObjectName(user.id, file.name, 1);

      // Upload to MinIO
      logger.debug(`Uploading new file to MinIO: ${objectName}`);
    const uploadStartTime = Date.now();
    await minioClient.putObject(BUCKET_NAME, objectName, buffer, buffer.length, {
      'Content-Type': file.type,
    });
    const uploadEndTime = Date.now();
    logger.success(`File uploaded to MinIO successfully in ${uploadEndTime - uploadStartTime}ms`);

      // Create file and version records
    const dbStartTime = Date.now();
      fileRecord = await prisma.file.create({
      data: {
        name: file.name,
        path: objectName,
        type: file.type,
        size: file.size,
        userId: user.id,
          currentVersion: 1,
          versions: {
            create: {
              version: 1,
              path: objectName,
              size: file.size,
            },
          },
        tags: {
          connectOrCreate: tags.map(tag => ({
            where: { name: tag },
            create: { name: tag },
          })),
        },
      },
        include: {
          versions: {
            orderBy: {
              version: 'desc',
            },
          },
        },
    });
    const dbEndTime = Date.now();
      logger.success(`Database records created in ${dbEndTime - dbStartTime}ms`);
    }

    const endTime = Date.now();
    logger.success(`Upload completed in ${endTime - startTime}ms`, {
      fileId: fileRecord.id,
      fileName: fileRecord.name,
      version: fileRecord.currentVersion,
      processingTime: endTime - startTime
    });

    return NextResponse.json({
      success: true,
      file: {
        id: fileRecord.id,
        name: fileRecord.name,
        type: fileRecord.type,
        size: fileRecord.size,
        currentVersion: fileRecord.currentVersion,
        versions: fileRecord.versions,
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