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
    // TEMP FIX: Remove userId query until attribute is added
    const queries = [];
    if (type) queries.push(Query.equal('type', type));

    const result = await databases.listDocuments<KnowledgeDocument>(
      DATABASE_ID,
      DOCUMENTS_TABLE_ID,
      queries
    );

    return NextResponse.json(result.documents);
  } catch (error) {
    console.error('Error fetching documents:', error);
    return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { title, type, source, content } = body as { 
      title: string; 
      type: 'file' | 'web'; 
      source: string; 
      content?: string;
    };

    if (!title || !type || !source) {
      return NextResponse.json({ error: 'Missing required fields: title, type, source' }, { status: 400 });
    }

    console.log('Creating document:', {
      title,
      type,
      hasContent: !!content,
      contentLength: content ? content.length : 0
    });

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
