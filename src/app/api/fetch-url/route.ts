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
  
  // Validate URL format
  let parsedUrl;
  try {
    parsedUrl = new URL(url);
  } catch {
    return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 });
  }
  
  console.log('Fetching content from URL:', url);
  
  try {
    const response = await axios.get(url, {
      timeout: 15000,
      maxRedirects: 5,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      }
    });
    
    if (!response.data) {
      throw new Error('No content received from URL');
    }
    
    console.log('Successfully fetched HTML content, parsing...');
    const $ = cheerio.load(response.data);
    
    // Remove unwanted elements more comprehensively
    $('script, style, nav, header, footer, aside, .advertisement, .ads, .cookie, .popup, .modal, noscript, iframe').remove();
    $('[class*="ad"], [id*="ad"], [class*="cookie"], [id*="cookie"]').remove();
    
    // Extract title with multiple fallbacks
    let title = '';
    title = $('meta[property="og:title"]').attr('content') || 
            $('meta[name="twitter:title"]').attr('content') ||
            $('title').text() ||
            $('h1').first().text() ||
            $('h2').first().text() ||
            parsedUrl.hostname;
    
    title = title.trim();
    
    // Extract content with multiple strategies
    let content = '';
    
    // Strategy 1: Look for structured content
    const contentSelectors = [
      '[role="main"]',
      'main',
      'article',
      '.content',
      '.post-content',
      '.article-content',
      '.entry-content',
      '.page-content',
      '#content',
      '#main-content',
      '.main-content'
    ];
    
    for (const selector of contentSelectors) {
      const element = $(selector);
      if (element.length > 0) {
        content = element.text();
        break;
      }
    }
    
    // Strategy 2: If no structured content, extract from paragraphs
    if (!content || content.trim().length < 100) {
      content = $('p').map((_, el) => $(el).text()).get().join('\n\n');
    }
    
    // Strategy 3: Last resort - get all text from body
    if (!content || content.trim().length < 50) {
      content = $('body').text();
    }
    
    // Clean up content
    content = content
      .replace(/\s+/g, ' ')
      .replace(/\n\s*\n/g, '\n\n')
      .trim();
    
    // Limit content length but try to end at sentence boundary
    if (content.length > 8000) {
      content = content.substring(0, 8000);
      const lastSentence = content.lastIndexOf('.');
      if (lastSentence > 6000) {
        content = content.substring(0, lastSentence + 1);
      }
    }
    
    // Extract meta description as additional context
    const description = $('meta[name="description"]').attr('content') || 
                       $('meta[property="og:description"]').attr('content') || '';
    
    console.log(`Extracted content - Title: "${title}", Content length: ${content.length}, Description: "${description.substring(0, 100)}..."`);
    console.log('Content preview (first 200 chars):', content.substring(0, 200) + '...');
    
    // Ensure we have meaningful content
    if (!content || content.trim().length < 20) {
      return NextResponse.json({
        title: title || parsedUrl.hostname,
        content: `Content from ${url}\n\n[Content extraction failed - please check the URL manually]`,
        description,
        url,
        warning: 'Limited content could be extracted from this page'
      });
    }
    
    return NextResponse.json({
      title,
      content,
      description,
      url,
      extractedAt: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error fetching URL:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json({
      title: parsedUrl.hostname,
      content: `URL: ${url}\n\nFailed to extract content from this webpage.\nError: ${errorMessage}\n\nPlease verify the URL is accessible and try again.`,
      error: 'Failed to fetch content from URL',
      details: errorMessage,
      url
    }, { status: 500 });
  }
}
