import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

// This is a simplified example - in a real app, you'd fetch from your database
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');
  
  // Get user ID from Clerk
  const { userId } = await auth();
  
  if (!userId) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    // In a real app, you would fetch documents from your database
    // For now, we'll use localStorage as a fallback
    interface Document {
      id: string;
      title: string;
      type: 'file' | 'web';
      source: string;
      lastUpdated: string;
      [key: string]: unknown;
    }
    
    let documents: Document[] = [];
    
    if (typeof window !== 'undefined') {
      const savedDocs = localStorage.getItem('kbai:documents');
      if (savedDocs) {
        try {
          const parsedDocs = JSON.parse(savedDocs);
          // Ensure we have an array with the required fields
          if (Array.isArray(parsedDocs)) {
            documents = parsedDocs.filter(
              (doc): doc is Document => 
                doc && 
                typeof doc === 'object' &&
                'id' in doc &&
                'title' in doc &&
                'type' in doc &&
                'source' in doc &&
                'lastUpdated' in doc &&
                (doc.type === 'file' || doc.type === 'web')
            );
          }
        } catch (error) {
          console.error('Error parsing documents from localStorage:', error);
        }
      }
    }

    // Filter by type if specified
    if (type) {
      documents = documents.filter(doc => doc.type === type);
    }

    return NextResponse.json(documents);
  } catch (error) {
    console.error('Error fetching documents:', error);
    return NextResponse.json(
      { error: 'Failed to fetch documents' },
      { status: 500 }
    );
  }
}
