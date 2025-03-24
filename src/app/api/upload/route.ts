import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { minioClient, BUCKET_NAME, generateObjectName } from '@/lib/minio';
import crypto from 'crypto';

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

// Function to extract tags from filename
// Format: supports both filename[tag1,tag2,tag3].ext and filename[tag1][tag2][tag3].ext
function extractTagsFromFilename(filename: string): { cleanName: string, extractedTags: string[] } {
  const tagRegex = /\[([^\]]+)\]/g;
  let cleanName = filename;
  const extractedTags: string[] = [];
  
  let match;
  while ((match = tagRegex.exec(filename)) !== null) {
    if (match[1]) {
      // Split comma-separated tags and trim each tag
      const tags = match[1].split(',').map(tag => tag.trim()).filter(Boolean);
      extractedTags.push(...tags);
    }
  }
  
  // Remove all [tag] sections from the filename
  cleanName = cleanName.replace(tagRegex, '');
  
  // Clean up extra spaces
  cleanName = cleanName.replace(/\s+/g, ' ').trim();
  
  // Handle possible space before extension
  cleanName = cleanName.replace(/ \.([a-zA-Z0-9]+)$/, '.$1');
  
  return { cleanName, extractedTags };
}

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
    let tags = formData.getAll('tags') as string[];
    const customFileName = formData.get('customFileName') as string;
    
    // Extract tags from filename if present
    const { cleanName, extractedTags } = extractTagsFromFilename(customFileName || file.name);
    const origFilename = file.name;
    
    // Merge tags from filename with tags from form
    if (extractedTags.length > 0) {
      tags = [...new Set([...tags, ...extractedTags])]; // Deduplicate tags
      logger.info(`Extracted tags from filename: ${extractedTags.join(', ')}`);
    }

    // Create a "clean" file object with the modified name
    // Note: We don't actually need to create a new File object since we just need the clean name
    // const fileWithCleanName = new File(
    //   [await file.arrayBuffer()],
    //   cleanName,
    //   { type: file.type }
    // );

    // Validate file
    if (!file) {
      logger.error('No file provided in request');
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    const fileInfo = {
      originalName: origFilename,
      name: cleanName,
      size: `${(file.size / (1024 * 1024)).toFixed(2)}MB`,
      type: file.type,
      extractedTags,
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
        name: cleanName, // Use the clean name without tags
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
    
    // Calculate file hash
    const hash = crypto.createHash('sha256').update(buffer).digest('hex');
    
    // Check for duplicate content
    const duplicateFile = await prisma.file.findFirst({
      where: {
        hash: hash,
        NOT: {
          name: cleanName // Exclude the current file if it exists
        }
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

    if (duplicateFile) {
      logger.info(`Duplicate content found for file: ${cleanName}`, {
        duplicateName: duplicateFile.name,
        hash: hash
      });
      return NextResponse.json(
        { 
          error: 'Duplicate content detected',
          duplicateFile: {
            id: duplicateFile.id,
            name: duplicateFile.name,
            path: duplicateFile.path,
            type: duplicateFile.type,
            size: duplicateFile.size,
            currentVersion: duplicateFile.currentVersion
          }
        },
        { status: 409 }
      );
    }

    if (existingFile) {
      // File exists, check if content is the same as the latest version
      const latestVersion = existingFile.versions[0];
      if (latestVersion && latestVersion.hash === hash) {
        // Content is the same, delete the previous version and keep the existing one
        logger.info(`New version has same content as previous version for file: ${cleanName}`);
        
        // Delete the previous version from MinIO
        if (latestVersion.path) {
          try {
            await minioClient.removeObject(BUCKET_NAME, latestVersion.path);
            logger.info(`Deleted previous version from MinIO: ${latestVersion.path}`);
          } catch (error) {
            logger.error(`Failed to delete previous version from MinIO: ${error}`);
            // Continue even if deletion fails
          }
        }

        // Update file record with new hash and tags
        fileRecord = await prisma.file.update({
          where: { id: existingFile.id },
          data: {
            hash: hash,
            tags: {
              set: [], // First disconnect all existing tags
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
            tags: true, // Include tags in the response
          },
        });

        logger.info(`File updated with same content: ${cleanName}`);
        return NextResponse.json({
          file: fileRecord,
          message: 'File updated with same content',
        });
      }

      // Content is different, create new version
      const newVersion = existingFile.currentVersion + 1;
      const objectName = generateObjectName(user.id, cleanName, newVersion);

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
            hash: hash,
            fileId: existingFile.id,
          },
        }),
        prisma.file.update({
          where: { id: existingFile.id },
          data: {
            currentVersion: newVersion,
            path: objectName,
            size: file.size,
            hash: hash,
            tags: {
              set: [], // First disconnect all existing tags
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
            tags: true, // Include tags in the response
          },
        }),
      ]);

      fileRecord = updatedFile;
      const dbEndTime = Date.now();
      logger.success(`Database records updated in ${dbEndTime - dbStartTime}ms`);
    } else {
      // New file, create first version
      const objectName = generateObjectName(user.id, cleanName, 1);

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
          name: cleanName,
          path: objectName,
          type: file.type,
          size: file.size,
          hash: hash,
          userId: user.id,
          currentVersion: 1,
          versions: {
            create: {
              version: 1,
              path: objectName,
              size: file.size,
              hash: hash,
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
          tags: true, // Include tags in the response
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
        tags: fileRecord.tags, // Include tags in the response
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