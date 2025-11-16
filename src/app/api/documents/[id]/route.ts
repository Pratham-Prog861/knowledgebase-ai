/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { databasesServer as databases, DATABASE_ID, DOCUMENTS_TABLE_ID } from "@/lib/appwrite-server";
import { KnowledgeDocument } from "@/types";
import { Query } from "node-appwrite";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { id } = await params;

    // Fetch document from Appwrite
    const document = await databases.getDocument(
      DATABASE_ID,
      DOCUMENTS_TABLE_ID,
      id
    );

    // Check if user owns this document
    if (document.userId !== userId) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    // If it's a web document and content is missing, fetch it
    if (document.type === 'web' && !document.content) {
      try {
        const response = await fetch(`${request.nextUrl.origin}/api/fetch-url?url=${encodeURIComponent(document.source)}`);
        if (response.ok) {
          const data = await response.json();
          // Update the document with fetched content
          await databases.updateDocument(
            DATABASE_ID,
            DOCUMENTS_TABLE_ID,
            id,
            {
              content: data.content,
              lastUpdated: new Date().toISOString(),
            }
          );
          document.content = data.content;
        }
      } catch (error) {
        console.error('Error fetching URL content:', error);
      }
    }

    // Transform to match frontend interface
    const transformedDocument: KnowledgeDocument = {
      $id: document.$id,
      title: document.title,
      type: document.type,
      source: document.source,
      content: document.content,
      lastUpdated: document.lastUpdated,
      userId: document.userId,
      $createdAt: document.$createdAt,
      $updatedAt: document.$updatedAt,
    };

    return NextResponse.json(transformedDocument);
  } catch (error) {
    console.error('Error fetching document:', error);
    if (error instanceof Error && error.message.includes('Document with the requested ID could not be found')) {
      return new NextResponse("Document not found", { status: 404 });
    }
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { title, content } = body;

    // Check if user owns this document
    const existingDoc = await databases.getDocument(
      DATABASE_ID,
      DOCUMENTS_TABLE_ID,
      id
    );

    if (existingDoc.userId !== userId) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    // Update document
    const updatedDocument = await databases.updateDocument(
      DATABASE_ID,
      DOCUMENTS_TABLE_ID,
      id,
      {
        title: title || existingDoc.title,
        content: content || existingDoc.content,
        lastUpdated: new Date().toISOString(),
      }
    );

    return NextResponse.json(updatedDocument);
  } catch (error) {
    console.error('Error updating document:', error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { id } = await params;

    // Try to fetch the document
    let existingDoc;
    try {
      existingDoc = await databases.getDocument(
        DATABASE_ID,
        DOCUMENTS_TABLE_ID,
        id
      );
    } catch (error) {
      if (error instanceof Error && error.message.includes('could not be found')) {
        return new NextResponse("Document not found", { status: 404 });
      }
      throw error;
    }

    // Check if user owns this document (handle missing userId field)
    if (existingDoc.userId && existingDoc.userId !== userId) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    // Delete document
    await databases.deleteDocument(
      DATABASE_ID,
      DOCUMENTS_TABLE_ID,
      id
    );

    return new NextResponse("Document deleted", { status: 200 });
  } catch (error) {
    console.error('Error deleting document:', error);
    
    // More specific error handling
    if (error instanceof Error) {
      if (error.message.includes('could not be found')) {
        return new NextResponse("Document not found", { status: 404 });
      }
      if (error.message.includes('Permission denied')) {
        return new NextResponse("Permission denied", { status: 403 });
      }
    }
    
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
