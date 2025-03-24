import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

// GET /api/packs/[id] - Get a specific pack
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
    // Get the pack
    const pack = await prisma.pack.findUnique({
      where: { id },
      include: {
        files: {
          select: {
            id: true,
            name: true,
            type: true,
            size: true,
            createdAt: true,
            currentVersion: true,
            tags: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });
    
    if (!pack) {
      return NextResponse.json({ error: 'Pack not found' }, { status: 404 });
    }
    
    return NextResponse.json({ pack });
  } catch (error) {
    console.error('Error in pack GET handler:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pack' },
      { status: 500 }
    );
  }
}

// PATCH /api/packs/[id] - Update a pack
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const { name, description, fileIds } = await request.json();
    
    // Verify the pack exists
    const existingPack = await prisma.pack.findUnique({
      where: { id },
      select: { id: true }
    });
    
    if (!existingPack) {
      return NextResponse.json({ error: 'Pack not found' }, { status: 404 });
    }
    
    // Update data to apply
    const updateData: any = {};
    
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;

    // First, get the current pack with files
    const currentPack = await prisma.pack.findUnique({
      where: { id },
      include: { files: true },
    });
    
    // Update the pack
    const updatedPack = await prisma.pack.update({
      where: { id },
      data: {
        ...updateData,
        // Handle files only if fileIds is provided
        ...(fileIds && {
          files: {
            // Disconnect all existing files
            disconnect: currentPack?.files.map(file => ({ id: file.id })),
            // Connect the new set of files
            connect: fileIds.map((fileId: string) => ({ id: fileId })),
          },
        }),
      },
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
    
    return NextResponse.json({ pack: updatedPack });
  } catch (error) {
    console.error('Error updating pack:', error);
    return NextResponse.json({ error: 'Failed to update pack' }, { status: 500 });
  }
}

// DELETE /api/packs/[id] - Delete a pack
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
    // Verify the pack exists
    const existingPack = await prisma.pack.findUnique({
      where: { id }
    });
    
    if (!existingPack) {
      return NextResponse.json({ error: 'Pack not found' }, { status: 404 });
    }
    
    // Delete the pack
    await prisma.pack.delete({
      where: { id },
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting pack:', error);
    return NextResponse.json({ error: 'Failed to delete pack' }, { status: 500 });
  }
} 