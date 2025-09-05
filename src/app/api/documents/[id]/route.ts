import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

interface Document {
  id: string;
  title: string;
  type: 'file' | 'web';
  source: string;
  lastUpdated: string;
  content?: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // In a real app, you would fetch the document from your database
    // For now, we'll use localStorage as a fallback
    let document: Document | null = null;
    
    if (typeof window !== 'undefined') {
      const savedDocs = localStorage.getItem('kbai:documents');
      if (savedDocs) {
        const documents: Document[] = JSON.parse(savedDocs);
        document = documents.find(doc => doc.id === params.id) || null;
      }
    }

    if (!document) {
      return new NextResponse("Document not found", { status: 404 });
    }

    // If it's a web document, fetch the content
    if (document.type === 'web' && !document.content) {
      try {
        const response = await fetch(`/api/fetch-url?url=${encodeURIComponent(document.source)}`);
        if (response.ok) {
          const data = await response.json();
          document.content = data.content;
        }
      } catch (error) {
        console.error('Error fetching URL content:', error);
      }
    }

    return NextResponse.json(document);
  } catch (error) {
    console.error('Error fetching document:', error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
