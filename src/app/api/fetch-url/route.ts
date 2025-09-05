// Create this new file
import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import * as cheerio from 'cheerio';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');
  
  if (!url) {
    return NextResponse.json({ error: 'URL is required' }, { status: 400 });
  }
  
  try {
    const response = await axios.get(url, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    const $ = cheerio.load(response.data);
    
    // Remove unwanted elements
    $('script, style, nav, header, footer, aside, .advertisement, .ads').remove();
    
    // Extract title and main content
    const title = $('title').text() || $('h1').first().text() || new URL(url).hostname;
    const content = $('main, article, .content, .post-content, body').first().text()
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 5000); // Limit content length
    
    return NextResponse.json({
      title,
      content,
      url
    });
  } catch (error) {
    console.error('Error fetching URL:', error);
    return NextResponse.json(
      { error: 'Failed to fetch content from URL' }, 
      { status: 500 }
    );
  }
}
