import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { databasesServer as databases, DATABASE_ID, SEARCH_RESULTS_TABLE_ID, DOCUMENTS_TABLE_ID } from '@/lib/appwrite-server';
import { ID, Query } from 'node-appwrite';

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { query } = await req.json();
    if (!query || typeof query !== 'string') {
      return NextResponse.json({ error: 'Missing query' }, { status: 400 });
    }

    // Very simple placeholder search: list user's documents and return basic answer
    const docs = await (databases as any).listRows(
      DATABASE_ID,
      DOCUMENTS_TABLE_ID,
      [Query.equal('userId', userId), Query.limit(5)]
    );

    const sources = docs.rows.map((d: any) => ({
      id: d.$id,
      title: d.title,
      type: d.type,
      url: d.type === 'web' ? d.source : undefined,
    }));

    const answer = sources.length
      ? `I searched your knowledge base and found ${sources.length} relevant item(s).`
      : 'I could not find relevant items in your knowledge base yet.';

    const saved = await (databases as any).createRow(
      DATABASE_ID,
      SEARCH_RESULTS_TABLE_ID,
      {
        question: query,
        answer,
        sources,
        userId,
        timestamp: new Date().toISOString(),
      }
    );

    return NextResponse.json({ answer, sources });
  } catch (error) {
    console.error('Search API error:', error);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}


