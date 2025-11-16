import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { databasesServer as databases, DATABASE_ID, DOCUMENTS_TABLE_ID } from '@/lib/appwrite-server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const status: any = {
    timestamp: new Date().toISOString(),
    userId,
    checks: {}
  };

  // Check environment variables
  status.checks.environment = {
    hasGoogleAI: !!process.env.GOOGLE_GENAI_API_KEY,
    hasAppwrite: !!process.env.APPWRITE_API_KEY,
    hasDatabaseId: !!DATABASE_ID,
    hasDocumentsTableId: !!DOCUMENTS_TABLE_ID
  };

  // Check Google AI API
  try {
    if (process.env.GOOGLE_GENAI_API_KEY) {
      const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENAI_API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
      const result = await model.generateContent("Say 'Hello world' to test the API");
      const response = await result.response;
      const text = response.text();
      status.checks.googleAI = {
        working: true,
        response: text.substring(0, 100)
      };
    } else {
      status.checks.googleAI = {
        working: false,
        error: 'API key not configured'
      };
    }
  } catch (error) {
    status.checks.googleAI = {
      working: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }

  // Check Appwrite database connection
  try {
    const docs = await databases.listDocuments(
      DATABASE_ID,
      DOCUMENTS_TABLE_ID,
      []
    );
    status.checks.appwrite = {
      working: true,
      documentsCount: docs.documents.length,
      userDocuments: docs.documents.filter((doc: any) => !doc.userId || doc.userId === userId).length
    };
  } catch (error) {
    status.checks.appwrite = {
      working: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }

  // Overall health
  const allWorking = Object.values(status.checks).every((check: any) => 
    check.working !== false && !check.error
  );

  status.overallHealth = allWorking ? 'healthy' : 'issues_detected';

  return NextResponse.json(status);
}
