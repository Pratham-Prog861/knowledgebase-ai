import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import pdf from 'pdf-parse';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const data = await pdf(buffer);
    
    return NextResponse.json({ text: data.text });
  } catch (error) {
    console.error('PDF parsing error:', error);
    return NextResponse.json({ error: 'Failed to parse PDF' }, { status: 500 });
  }
}