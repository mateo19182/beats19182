import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';
import { nanoid } from 'nanoid';

// GET /api/packs - Get all packs for current user
export async function GET(request: NextRequest) {
  try {
    // Get the admin user ID directly
    const adminUser = await prisma.user.findFirst({
      where: { role: "ADMIN" },
      select: { id: true }
    });
    
    if (!adminUser) {
      return NextResponse.json({ error: 'Admin user not found' }, { status: 500 });
    }
    
    // Get all packs for the admin user
    const packs = await prisma.pack.findMany({
      where: {
        userId: adminUser.id,
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
      orderBy: {
        createdAt: 'desc',
      },
    });
    
    return NextResponse.json({ packs });
  } catch (error) {
    console.error('Error fetching packs:', error);
    return NextResponse.json({ error: 'Failed to fetch packs' }, { status: 500 });
  }
}

// POST /api/packs - Create a new pack
export async function POST(request: NextRequest) {
  try {
    // Get the admin user ID directly
    const adminUser = await prisma.user.findFirst({
      where: { role: "ADMIN" },
      select: { id: true }
    });
    
    if (!adminUser) {
      return NextResponse.json({ error: 'Admin user not found' }, { status: 500 });
    }
    
    const { name, description = '', fileIds = [] } = await request.json();
    
    if (!name || name.trim() === '') {
      return NextResponse.json({ error: 'Pack name is required' }, { status: 400 });
    }
    
    // Generate a unique share link
    const shareLink = nanoid(10);
    
    // Create the new pack
    const pack = await prisma.pack.create({
      data: {
        name,
        description,
        shareLink,
        userId: adminUser.id,
        files: {
          connect: fileIds.map((id: string) => ({ id })),
        },
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
    
    return NextResponse.json({ pack }, { status: 201 });
  } catch (error) {
    console.error('Error creating pack:', error);
    return NextResponse.json({ error: 'Failed to create pack' }, { status: 500 });
  }
} 