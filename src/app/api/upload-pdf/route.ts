import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('Processing PDF upload request...');
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    console.log('File details:', {
      name: file.name,
      size: file.size,
      type: file.type
    });

    // Validate file type
    if (!file.type.includes('pdf') && !file.name.toLowerCase().endsWith('.pdf')) {
      return NextResponse.json({ error: 'Invalid file type. Please upload a PDF file.' }, { status: 400 });
    }

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large. Maximum size is 10MB.' }, { status: 400 });
    }

    console.log('Converting PDF file to base64 for AI processing...');
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString('base64');
    
    console.log('PDF converted to base64 successfully. Size:', Math.round(buffer.length / 1024), 'KB');
    
    // Return the base64 data for storage - the AI will process it when needed
    return NextResponse.json({ 
      text: `[PDF Document: ${file.name}]\n\nThis PDF file has been uploaded and will be processed by AI when you ask questions about it.`,
      base64Data: base64,
      fileName: file.name,
      fileSize: file.size,
      mimeType: 'application/pdf'
    });
  } catch (error) {
    console.error('PDF parsing error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ 
      error: 'Failed to parse PDF', 
      details: errorMessage,
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}