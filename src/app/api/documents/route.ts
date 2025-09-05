import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { databasesServer as databases, DATABASE_ID, DOCUMENTS_TABLE_ID } from '@/lib/appwrite-server';
import { KnowledgeDocument } from '@/types';
import { Query, ID } from 'node-appwrite';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url); 
  const type = searchParams.get('type') as 'file' | 'web' | undefined;
  
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const queries = [Query.equal('userId', userId)];
    if (type) queries.push(Query.equal('type', type));

    const result = await databases.listDocuments<KnowledgeDocument>(
      DATABASE_ID,
      DOCUMENTS_TABLE_ID,
      queries
    );

    const documents: KnowledgeDocument[] = result.documents;

    return NextResponse.json(documents);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error fetching documents:', error);
    return NextResponse.json({ error: 'Failed to fetch documents', message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { title, type, source, content } = body as { title: string; type: 'file' | 'web'; source: string; content?: string };

    if (!title || !type || !source) {
      return NextResponse.json({ error: 'Missing required fields: title, type, source' }, { status: 400 });
    }

    const created = await databases.createDocument<KnowledgeDocument>(
      DATABASE_ID,
      DOCUMENTS_TABLE_ID,
      ID.unique(),
      {
        title,
        type,
        source,
        content: content || '',
        userId,
      }
    );

    return NextResponse.json(created);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error creating document:', error);
    return NextResponse.json({ error: 'Failed to create document', message }, { status: 500 });
  }
}
