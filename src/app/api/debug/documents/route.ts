import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { databasesServer as databases, DATABASE_ID, DOCUMENTS_TABLE_ID } from '@/lib/appwrite-server';
import { Query } from 'node-appwrite';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('Debug: Fetching documents for user:', userId);

    // Get all documents
    const docs = await databases.listDocuments(
      DATABASE_ID,
      DOCUMENTS_TABLE_ID,
      [Query.limit(50)]
    );

    console.log(`Debug: Found ${docs.documents.length} total documents in database`);

    // Filter by userId on client side and log details
    const userDocs = docs.documents.filter((doc: any) => !doc.userId || doc.userId === userId);
    console.log(`Debug: Found ${userDocs.length} documents for current user`);

    const debugInfo = userDocs.map((doc: any) => ({
      id: doc.$id,
      title: doc.title,
      type: doc.type,
      source: doc.source,
      contentLength: doc.content?.length || 0,
      contentPreview: doc.content ? doc.content.substring(0, 200) + '...' : 'No content',
      hasFileData: !!doc.fileData,
      userId: doc.userId,
      createdAt: doc.$createdAt
    }));

    return NextResponse.json({
      totalDocuments: docs.documents.length,
      userDocuments: userDocs.length,
      currentUserId: userId,
      documents: debugInfo
    });

  } catch (error) {
    console.error('Debug documents error:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch documents', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
