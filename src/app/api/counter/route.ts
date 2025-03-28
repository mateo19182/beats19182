import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// Get the current counter value
export async function GET() {
  try {
    // We'll use raw SQL to query or create the counter without requiring schema migration
    const result = await prisma.$queryRaw<{ count: number }[]>`
      SELECT count FROM "visit_counter" WHERE id = 'global_counter' LIMIT 1
    `;
    
    const count = result.length > 0 ? Number(result[0].count) : 0;
    return NextResponse.json({ count });
  } catch (error) {
    console.error('Error fetching counter:', error);
    // If the table doesn't exist yet, return 0
    return NextResponse.json({ count: 0 });
  }
}

// Increment the counter
export async function POST() {
  try {
    // First, make sure the table exists
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "visit_counter" (
        id TEXT PRIMARY KEY,
        count INTEGER NOT NULL DEFAULT 0
      )
    `;
    
    // Try to insert a new record if it doesn't exist, otherwise update the existing one
    await prisma.$executeRaw`
      INSERT INTO "visit_counter" (id, count)
      VALUES ('global_counter', 1)
      ON CONFLICT (id) 
      DO UPDATE SET count = "visit_counter".count + 1
    `;
    
    // Get the updated counter value
    const result = await prisma.$queryRaw<{ count: number }[]>`
      SELECT count FROM "visit_counter" WHERE id = 'global_counter' LIMIT 1
    `;
    
    const count = result.length > 0 ? Number(result[0].count) : 1;
    return NextResponse.json({ count });
  } catch (error) {
    console.error('Error incrementing counter:', error);
    return NextResponse.json({ error: 'Failed to increment counter' }, { status: 500 });
  }
}
