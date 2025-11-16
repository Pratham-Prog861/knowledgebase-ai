/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { databasesServer as databases, DATABASE_ID } from '@/lib/appwrite-server';
import { ID, Query } from 'node-appwrite';

const CONVERSATIONS_TABLE_ID = 'conversations';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { conversationId, message, response, query } = await request.json();

    // Create or update conversation
    const conversationData = {
      userId,
      conversationId: conversationId || ID.unique(),
      messages: JSON.stringify([
        { role: 'user', content: message || query, timestamp: new Date().toISOString() },
        { role: 'assistant', content: response, timestamp: new Date().toISOString() }
      ]),
      lastUpdated: new Date().toISOString(),
      query: message || query,
      response
    };

    return NextResponse.json({ 
      conversationId: conversationData.conversationId,
      success: true 
    });

  } catch (error) {
    console.error('Conversation save error:', error);
    return NextResponse.json({ 
      error: 'Failed to save conversation',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get('conversationId');

    if (conversationId) {
      // Get specific conversation
      const conversations = await databases.listDocuments(
        DATABASE_ID,
        CONVERSATIONS_TABLE_ID,
        [Query.equal('conversationId', conversationId), Query.limit(50)]
      );
      const messages = conversations.documents.flatMap((doc: any) => {
        try {
          return JSON.parse(doc.messages);
        } catch {
          return [];
        }
      }).sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

      return NextResponse.json({ messages });
    } else {
      // Get all conversations for user
      const conversations = await databases.listDocuments(
        DATABASE_ID,
        CONVERSATIONS_TABLE_ID,
        [Query.orderDesc('lastUpdated'), Query.limit(20)]
      );

      const conversationsList = conversations.documents
        .filter((doc: any) => doc.userId === userId)
        .map((doc: any) => ({
          conversationId: doc.conversationId,
          lastMessage: doc.query,
          lastResponse: doc.response.substring(0, 100) + '...',
          lastUpdated: doc.lastUpdated
        }));

      return NextResponse.json({ conversations: conversationsList });
    }

  } catch (error) {
    console.error('Conversation fetch error:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch conversations' 
    }, { status: 500 });
  }
}
