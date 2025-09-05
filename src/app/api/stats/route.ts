import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { databasesServer as databases, DATABASE_ID, USAGE_STATS_TABLE_ID } from '@/lib/appwrite-server';
import { ID, Query } from 'node-appwrite';

export async function GET() {
  const { userId } = await auth();
  
  if (!userId) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const result = await (databases as any).listRows(
      DATABASE_ID,
      USAGE_STATS_TABLE_ID,
      [Query.equal('userId', userId)]
    );

    if (result.rows.length > 0) {
      return NextResponse.json(result.rows[0]);
    }

    return NextResponse.json({
      totalDocuments: 0,
      totalFiles: 0,
      totalLinks: 0,
      queriesThisMonth: 0,
    });
  } catch (error) {
    console.error('Error fetching usage stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch usage stats' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const { userId } = await auth();
  
  if (!userId) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const { totalDocuments, totalFiles, totalLinks, queriesThisMonth } = body;

    const existing = await (databases as any).listRows(
      DATABASE_ID,
      USAGE_STATS_TABLE_ID,
      [Query.equal('userId', userId)]
    );

    if (existing.rows.length > 0) {
      const doc = existing.rows[0];
      const updated = await (databases as any).updateRow(
        DATABASE_ID,
        USAGE_STATS_TABLE_ID,
        doc.$id,
        {
          totalDocuments,
          totalFiles,
          totalLinks,
          queriesThisMonth,
          lastUpdated: new Date().toISOString(),
        }
      );
      return NextResponse.json(updated);
    }

    const created = await (databases as any).createRow(
      DATABASE_ID,
      USAGE_STATS_TABLE_ID,
      {
        userId,
        totalDocuments: totalDocuments ?? 0,
        totalFiles: totalFiles ?? 0,
        totalLinks: totalLinks ?? 0,
        queriesThisMonth: queriesThisMonth ?? 0,
        lastUpdated: new Date().toISOString(),
      }
    );

    return NextResponse.json(created);
  } catch (error) {
    console.error('Error updating usage stats:', error);
    return NextResponse.json(
      { error: 'Failed to update usage stats' },
      { status: 500 }
    );
  }
}
