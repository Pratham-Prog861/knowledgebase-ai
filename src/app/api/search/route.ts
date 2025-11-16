import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { databasesServer as databases, DATABASE_ID, SEARCH_RESULTS_TABLE_ID, DOCUMENTS_TABLE_ID } from '@/lib/appwrite-server';
import { ID, Query, Models } from 'node-appwrite';
import { GoogleGenerativeAI } from '@google/generative-ai';
import axios from 'axios';
import { KnowledgeDocument } from '@/types';

// Types for Google Generative AI content
type AIContentPart = {
  text: string;
} | {
  inlineData: {
    data: string;
    mimeType: string;
  };
};

// Helper function to detect general knowledge questions
function isGeneralKnowledgeQuestion(query: string): boolean {
  const lowerQuery = query.toLowerCase().trim();
  
  const generalKnowledgePatterns = [
    // Technology and AI
    /^what is (ai|artificial intelligence)\??$/i,
    /^what is (machine learning|ml)\??$/i,
    /^what is (data science|big data)\??$/i,
    /^what is (blockchain|cryptocurrency)\??$/i,
    /^what is (cloud computing|aws|azure|gcp)\??$/i,
    
    // Programming
    /^what is (javascript|python|java|react|node\.?js|typescript|html|css)\??$/i,
    /^what is programming\??$/i,
    /^what is coding\??$/i,
    
    // Science and general concepts
    /^what is (physics|chemistry|biology|mathematics|math)\??$/i,
    /^what is (science|technology|engineering)\??$/i,
    /^what is (history|geography|philosophy)\??$/i,
    
    // General question patterns
    /^define\s+/i,
    /^explain\s+(what|how|why)\s+/i,
    /^how does\s+.+\s+work\??$/i,
    /^what are\s+.+\??$/i,
    /^tell me about\s+/i,
    /^describe\s+/i,
    /^who (is|was|are|were)\s+/i,
    /^when (is|was|are|were|did|does)\s+/i,
    /^where (is|was|are|were|did|does)\s+/i,
    /^why (is|was|are|were|did|does)\s+/i,
    /^how (is|was|are|were|did|does|do|to)\s+/i,
  ];
  
  // Check if query matches general knowledge patterns
  const matchesPattern = generalKnowledgePatterns.some(pattern => pattern.test(query.trim()));
  
  // Additional heuristics for general knowledge
  const generalTerms = ['what is', 'how does', 'explain', 'define', 'tell me about', 'describe', 'who is', 'when did', 'where is', 'why does'];
  const containsGeneralTerm = generalTerms.some(term => lowerQuery.startsWith(term));
  
  // If it's asking about common concepts without specific personal context
  const isGeneralConcept = !lowerQuery.includes('my ') && !lowerQuery.includes('i ') && 
                          !lowerQuery.includes('pratham') && !lowerQuery.includes('resume') &&
                          !lowerQuery.includes('document') && !lowerQuery.includes('file');
  
  return matchesPattern || (containsGeneralTerm && isGeneralConcept);
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { query } = await req.json();
    if (!query || typeof query !== 'string') {
      return NextResponse.json({ error: 'Missing query' }, { status: 400 });
    }

    console.log(`Searching knowledge base for user ${userId} with query: "${query}"`);

    // Get user's documents with content (filter by userId when supported)
    const docs = await databases.listDocuments(
      DATABASE_ID,
      DOCUMENTS_TABLE_ID,
      [Query.limit(50)] // Get more documents for better search
    );
    
    // Filter documents by userId on the client side as a fallback
    // Note: Ideally this should be filtered at the database level
    const userDocs = {
      documents: docs.documents.filter((doc: Models.Document & Partial<KnowledgeDocument>) => {
        const knowledgeDoc = doc as KnowledgeDocument;
        return !knowledgeDoc.userId || knowledgeDoc.userId === userId;
      })
    };

    if (!userDocs.documents.length) {
      // If it's a general knowledge question, we can still answer it
      const isGeneralKnowledgeQuery = isGeneralKnowledgeQuestion(query);
      if (isGeneralKnowledgeQuery) {
        console.log('No documents found, but this is a general knowledge question - proceeding with AI answer');
        
        // Process general knowledge question without documents
        const apiKey = process.env.GOOGLE_GENAI_API_KEY;
        if (!apiKey) {
          return NextResponse.json({ error: 'AI service not configured' }, { status: 500 });
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ 
          model: "gemini-2.0-flash",
          generationConfig: {
            temperature: 0.3,
          },
        });

        const systemPrompt = `You are an expert AI assistant with comprehensive knowledge across many domains.

The user asked: "${query}"

This is a general knowledge question. Please provide a detailed, accurate, and educational answer based on your training knowledge. Make your response comprehensive and informative.

INSTRUCTIONS:
1. Provide a thorough explanation using your general knowledge
2. Include relevant examples, definitions, and context
3. Structure your answer clearly with sections if appropriate
4. Be educational and comprehensive

Focus on giving an excellent general knowledge answer to their question.`;

        try {
          const result = await model.generateContent([{ text: systemPrompt }]);
          const response = await result.response;
          const aiAnswer = response.text();

          if (!aiAnswer || aiAnswer.trim().length === 0) {
            throw new Error('AI returned empty response');
          }

          console.log('AI generated general knowledge answer successfully, length:', aiAnswer.length);

          // Save search result (skip userId to avoid schema issues)
          try {
            await databases.createDocument(
              DATABASE_ID,
              SEARCH_RESULTS_TABLE_ID,
              ID.unique(),
              {
                question: query,
                answer: aiAnswer,
                sources: [],
                timestamp: new Date().toISOString(),
              }
            );
            console.log('General knowledge search result saved successfully');
          } catch (saveError) {
            console.error('Failed to save search result:', saveError);
            // Continue anyway, the user still gets their answer
          }

          return NextResponse.json({ 
            answer: aiAnswer, 
            sources: [],
            isGeneralKnowledge: true
          });

        } catch (error) {
          console.error('General knowledge AI failed:', error);
          return NextResponse.json({ error: 'Failed to generate answer' }, { status: 500 });
        }
      } else {
        return NextResponse.json({
          answer: "I couldn't find any documents in your knowledge base yet. Please upload some files or add web links first.",
          sources: []
        });
      }
    }

    console.log(`Found ${userDocs.documents.length} documents to search through`);
    
    // Log document details for debugging
    userDocs.documents.forEach((doc: Models.Document & Partial<KnowledgeDocument>, index: number) => {
      const knowledgeDoc = doc as KnowledgeDocument;
      console.log(`Document ${index + 1}: "${knowledgeDoc.title}" (${knowledgeDoc.type}) - Content length: ${knowledgeDoc.content?.length || 0}`);
      if (knowledgeDoc.content && knowledgeDoc.content.length > 0) {
        console.log(`Content preview: ${knowledgeDoc.content.substring(0, 100)}...`);
        
        // Check if it's JSON (embedded PDF data)
        try {
          const parsed = JSON.parse(knowledgeDoc.content);
          if (parsed.type === 'pdf') {
            console.log(`  -> This is an embedded PDF with base64 length: ${parsed.fileData?.base64?.length || 'N/A'}`);
          }
        } catch {
          console.log(`  -> This is regular text content`);
        }
      }
    });

    // Prepare context for AI analysis
    const documentsContext = userDocs.documents.map((doc: Models.Document & Partial<KnowledgeDocument>) => {
      const knowledgeDoc = doc as KnowledgeDocument;
      let textContent = knowledgeDoc.content || '';
      let fileData = null;
      
      // Check if content contains embedded PDF data
      if (knowledgeDoc.content) {
        try {
          const parsed = JSON.parse(knowledgeDoc.content);
          if (parsed.type === 'pdf' && parsed.fileData) {
            textContent = parsed.textContent || '';
            fileData = parsed.fileData;
            console.log(`Found embedded PDF data for document: ${knowledgeDoc.title}`);
          }
        } catch {
          // Not JSON, treat as regular text content
          textContent = knowledgeDoc.content;
        }
      }
      
      return {
        id: knowledgeDoc.$id,
        title: knowledgeDoc.title,
        type: knowledgeDoc.type,
        source: knowledgeDoc.source,
        content: textContent,
        fileData: fileData
      };
    });

    // Use AI to analyze the documents and answer the query
    const apiKey = process.env.GOOGLE_GENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'AI service not configured' }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.0-flash",
      generationConfig: {
        temperature: 0.3,
      },
    });

    // Detect if this is a general knowledge question
    const isGeneralKnowledgeQuery = isGeneralKnowledgeQuestion(query);
    console.log(`Query analysis - Is general knowledge question: ${isGeneralKnowledgeQuery}`);
    
    // Prepare content for AI analysis, handling both text and PDF files
    const hasPDFFiles = documentsContext.some(doc => doc.fileData && doc.fileData.mimeType === 'application/pdf');
    console.log(`hasPDFFiles: ${hasPDFFiles}`);
    
    const aiContent: AIContentPart[] = [];
    
    // Add system prompt based on query type
    let systemPrompt: string;
    
    if (isGeneralKnowledgeQuery) {
      // For general knowledge questions, provide comprehensive answers using general knowledge
      systemPrompt = `You are an expert AI assistant with comprehensive knowledge across many domains.

The user asked: "${query}"

This is a general knowledge question. Please provide a detailed, accurate, and educational answer based on your training knowledge. Make your response comprehensive and informative.

INSTRUCTIONS:
1. Provide a thorough explanation using your general knowledge
2. Include relevant examples, definitions, and context
3. Structure your answer clearly with sections if appropriate
4. Be educational and comprehensive
5. If the user also has relevant documents in their knowledge base, you may mention them as additional context at the end

Focus primarily on giving an excellent general knowledge answer to their question.`;
    } else {
      // For specific queries about their knowledge base, focus on documents
      systemPrompt = `You are an AI assistant helping to search and analyze a user's knowledge base.
You have access to their uploaded documents (including PDF files) and web links.

IMPORTANT: You can read PDF files directly. When a PDF file is provided, analyze its content thoroughly.

INSTRUCTIONS:
1. Read and analyze ALL provided documents carefully (both text content and PDF files)
2. For PDF files: Extract information about people, companies, services, or any relevant data
3. Answer the user's question based on the content in ALL the documents
4. If you can read a PDF file, use that information to answer questions about it
5. If the answer isn't in the documents, say so clearly and suggest they might want to ask a general question instead
6. Provide specific citations from the relevant documents
7. Be detailed and comprehensive in your analysis

User Question: ${query}

Please analyze all the provided documents and give a comprehensive answer based on their content.`;
    }
    
    aiContent.push({ text: systemPrompt });
    
    // Add text-based documents (with different approach for general knowledge questions)
    const textDocuments = documentsContext.filter(doc => !doc.fileData);
    console.log(`Found ${textDocuments.length} text-based documents for AI analysis`);
    
    if (textDocuments.length > 0) {
      const contextText = textDocuments.map(doc => {
        console.log(`Including text document: "${doc.title}" with ${doc.content.length} characters`);
        return `=== ${doc.title} (${doc.type}) ===\n${doc.content}\n\n`;
      }).join('');
      
      // Limit text content length (shorter for general knowledge questions)
      const maxTextLength = isGeneralKnowledgeQuery ? 5000 : 20000;
      const finalTextContent = contextText.length > maxTextLength 
        ? contextText.substring(0, maxTextLength) + "... [additional text content truncated]"
        : contextText;
        
      console.log(`Final text content length for AI: ${finalTextContent.length} characters`);
      console.log(`Text content preview: ${finalTextContent.substring(0, 300)}...`);
        
      if (finalTextContent.trim()) {
        const documentLabel = isGeneralKnowledgeQuery 
          ? `USER'S KNOWLEDGE BASE (for reference only):\n${finalTextContent}` 
          : `TEXT DOCUMENTS:\n${finalTextContent}`;
        aiContent.push({ text: documentLabel });
      }
    }
    
    // Add PDF files directly to AI
    const pdfDocuments = documentsContext.filter(doc => doc.fileData && doc.fileData.mimeType === 'application/pdf');
    console.log(`Including ${pdfDocuments.length} PDF files for AI analysis`);
    
    if (pdfDocuments.length > 0) {
      console.log('PDF documents details:');
      pdfDocuments.forEach((doc, index) => {
        console.log(`PDF ${index + 1}: "${doc.title}" - Base64 length: ${doc.fileData.base64.length}`);
        
        aiContent.push({ 
          text: `PDF Document: "${doc.title}" (File: ${doc.fileData.fileName})` 
        });
        
        // Add the PDF file as inline data for AI to process
        aiContent.push({
          inlineData: {
            data: doc.fileData.base64,
            mimeType: doc.fileData.mimeType
          }
        });
      });
    } else {
      console.log('No PDF files found in documents context');
    }

    try {
      console.log(`Attempting to process query with AI. Text docs: ${textDocuments.length}, PDF docs: ${pdfDocuments.length}`);
      
      // For PDF documents, use the chat API which handles PDFs better
      if (pdfDocuments.length > 0 && pdfDocuments[0].fileData) {
        console.log('Using chat API for PDF processing', {
          fileName: pdfDocuments[0].fileData.fileName,
          base64Length: pdfDocuments[0].fileData.base64.length
        });
        
        const chatResponse = await fetch(`${process.env.NEXTJS_URL || 'http://localhost:3000'}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [{ role: 'user', content: query }],
            context: {
              title: pdfDocuments[0].title,
              type: 'file',
              content: pdfDocuments[0].content,
              source: pdfDocuments[0].source
            },
            documentType: 'pdf',
            fileBase64: pdfDocuments[0].fileData.base64,
            fileMime: pdfDocuments[0].fileData.mimeType
          })
        });
        
        if (chatResponse.ok) {
          const chatData = await chatResponse.json();
          const aiAnswer = chatData.reply;
          
          if (aiAnswer) {
            const relevantSources = [{
              id: pdfDocuments[0].id,
              title: pdfDocuments[0].title,
              type: pdfDocuments[0].type,
              url: undefined
            }];
            
            console.log('Successfully processed PDF through chat API, answer length:', aiAnswer.length);
            
            // Save the successful search result
            try {
              await databases.createDocument(
                DATABASE_ID,
                SEARCH_RESULTS_TABLE_ID,
                ID.unique(),
                {
                  question: query,
                  answer: aiAnswer,
                  sources: JSON.stringify(relevantSources),
                  timestamp: new Date().toISOString(),
                }
              );
            } catch (saveError) {
              console.error('Failed to save search result:', saveError);
              // Continue anyway, the user still gets their answer
            }
            
            return NextResponse.json({ 
              answer: aiAnswer, 
              sources: relevantSources 
            });
          } else {
            console.error('Chat API returned empty response');
            throw new Error('AI service returned empty response');
          }
        } else {
          const errorText = await chatResponse.text();
          console.error('Chat API failed:', errorText);
          throw new Error(`Chat API failed: ${chatResponse.status}`);
        }
      }
      
      // Fallback to regular processing for non-PDF or when chat API fails
      console.log('Using direct AI processing with content length:', aiContent.length);
      console.log('AI content preview:', JSON.stringify(aiContent.slice(0, 2), null, 2));
      
      const result = await model.generateContent(aiContent);
      const response = await result.response;
      const aiAnswer = response.text();
      
      if (!aiAnswer || aiAnswer.trim().length === 0) {
        throw new Error('AI returned empty response');
      }
      
      console.log('AI generated answer successfully, length:', aiAnswer.length);

      // Identify relevant sources based on AI analysis
      const relevantSources = documentsContext
        .filter(doc => {
          // Simple heuristic: if document content contains key terms from query or AI mentions the document
          const queryTerms = query.toLowerCase().split(' ').filter(term => term.length > 2);
          const docContent = doc.content.toLowerCase();
          const docTitle = doc.title.toLowerCase();
          
          return queryTerms.some(term => 
            docContent.includes(term) || 
            docTitle.includes(term) ||
            aiAnswer.toLowerCase().includes(docTitle)
          );
        })
        .slice(0, 5) // Limit to top 5 sources
        .map(doc => ({
          id: doc.id,
          title: doc.title,
          type: doc.type,
          url: doc.type === 'web' ? doc.source : undefined,
        }));

      console.log(`AI generated answer with ${relevantSources.length} relevant sources`);

      // Save search result
      try {
        await databases.createDocument(
          DATABASE_ID,
          SEARCH_RESULTS_TABLE_ID,
          ID.unique(),
          {
            question: query,
            answer: aiAnswer,
            sources: JSON.stringify(relevantSources),
            timestamp: new Date().toISOString(),
          }
        );
        console.log('Search result saved successfully');
      } catch (saveError) {
        console.error('Failed to save search result:', saveError);
        // Continue anyway, the user still gets their answer
      }

      return NextResponse.json({ 
        answer: aiAnswer, 
        sources: relevantSources 
      });

    } catch (aiError) {
      console.error('AI analysis failed:', aiError);
      
      // Try Google search as fallback
      try {
        console.log('Attempting Google search fallback for query:', query);
        const googleResults = await searchGoogle(query);
        
        const fallbackAnswer = `I couldn't analyze your knowledge base documents due to a technical issue, but here's what I found online about "${query}":\n\n${googleResults.summary}\n\nYou might also want to check if your documents were uploaded correctly.`;
        
        return NextResponse.json({ 
          answer: fallbackAnswer, 
          sources: googleResults.sources,
          isGoogleSearch: true
        });
      } catch (googleError) {
        console.error('Google search fallback also failed:', googleError);
        
        // Final fallback to simple keyword matching
        const queryTerms = query.toLowerCase().split(' ').filter(term => term.length > 2);
        const relevantDocs = documentsContext
          .filter(doc => {
            const content = (doc.title + ' ' + doc.content).toLowerCase();
            return queryTerms.some(term => content.includes(term));
          })
          .slice(0, 5);

        const fallbackSources = relevantDocs.map(doc => ({
          id: doc.id,
          title: doc.title,
          type: doc.type,
          url: doc.type === 'web' ? doc.source : undefined,
        }));

        const finalAnswer = relevantDocs.length
          ? `I found ${relevantDocs.length} document(s) that might be relevant to your query. Please check the sources below for more details.`
          : `I encountered technical difficulties searching both your knowledge base and online sources. Please try rephrasing your question or check if the relevant documents have been uploaded correctly.`;

        return NextResponse.json({ 
          answer: finalAnswer, 
          sources: fallbackSources 
        });
      }
    }
  } catch (error) {
    console.error('Search API error:', error);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}

// Simple Google search fallback using a web scraping approach
async function searchGoogle(query: string) {
  try {
    // Use a simple Google search approach
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
    
    const response = await axios.get(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      timeout: 10000
    });
    
    // Very basic extraction of search results
    const html = response.data;
    
    // Simple regex to extract some search result titles and snippets
    const titleMatches = html.match(/<h3[^>]*>([^<]+)<\/h3>/g) || [];
    const snippetMatches = html.match(/<span[^>]*data-ved[^>]*>([^<]+)<\/span>/g) || [];
    
    interface SearchResult {
      title: string;
      url: string;
      content: string;
    }

    const results: SearchResult[] = titleMatches.slice(0, 3).map((title: string, index: number): SearchResult => {
      const cleanTitle = title.replace(/<[^>]*>/g, '').trim();
      const snippet = snippetMatches[index] ? snippetMatches[index].replace(/<[^>]*>/g, '').trim() : '';
      
      return {
        title: cleanTitle || `Result ${index + 1}`,
        url: `https://www.google.com/search?q=${encodeURIComponent(query)}`,
        content: snippet || 'No snippet available'
      };
    });
    
    const summary = results.length > 0 
      ? results.map((r: SearchResult, i: number) => `${i + 1}. ${r.title}: ${r.content}`).join('\n\n')
      : 'No specific results found from online search.';
    
    return {
      summary,
      sources: results.slice(0, 3)
    };
  } catch (error) {
    console.error('Google search failed:', error);
    
    // Return a simple response indicating web search isn't available
    return {
      summary: `I couldn't search online for "${query}" due to technical limitations. You might want to search Google directly for this information.`,
      sources: [{
        title: 'Search Google directly',
        url: `https://www.google.com/search?q=${encodeURIComponent(query)}`,
        content: 'Click here to search Google for this query'
      }]
    };
  }
}


