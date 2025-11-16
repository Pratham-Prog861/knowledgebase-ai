import { NextRequest } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Maximum context length to avoid hitting token limits
const MAX_CONTEXT_LENGTH = 28000;

// Document type for type safety
interface DocumentContext {
  title: string;
  type: 'file' | 'web';
  content: string;
  source: string;
}

interface ChatMessage {
  role: 'user' | 'model';
  parts: Array<{ text: string }>;
}

// Enhanced system prompt for better context understanding
const getSystemPrompt = (context: DocumentContext | null, documentType?: 'resume' | 'web', hasPdfFile?: boolean) => {
  if (!context && !hasPdfFile) return "You are a helpful AI assistant. Answer questions to the best of your ability.";

  const { title, type } = context || { title: 'Document', type: 'file' };
  
  // Special handling for different document types
  if (documentType === 'resume') {
    return `You are an expert at analyzing resumes and professional profiles. 
    The following is a resume/CV. Answer questions about the person's experience, skills, 
    education, and other professional details based on this information. If the information 
    isn't in the resume, say you don't know.\n\n`;
  } else if (documentType === 'web') {
    return `You are analyzing content from a web page. Use the following content to answer 
    questions about the page. If the information isn't in the content, say you don't know.\n\n`;
  } else if (hasPdfFile) {
    return `You are analyzing a PDF document. Please read and understand the content of this PDF file, 
    then answer questions about it. Use the information from the PDF to provide accurate answers. 
    If the information isn't in the PDF, say you don't know rather than making up an answer.\n\n`;
  }

  // Default context handling
  return `You are answering questions about the following ${type === 'file' ? 'document' : 'web page'}: ${title}\n\n` +
    `Use the following content to answer questions. If the answer isn't in the content, ` +
    `say you don't know rather than making up an answer.\n\n`;
};

export async function POST(req: NextRequest) {
  try {
    const { messages, context, documentType, fileBase64, fileMime } = (await req.json()) as {
      messages: Array<{ role: string; content: string; timestamp?: Date }>;
      context?: {
        title: string;
        type: 'file' | 'web';
        content: string;
        source: string;
      } | null;
      documentType?: string;
      fileBase64?: string;
      fileMime?: string;
    };
    
    // Log incoming request details for debugging
    console.log('🔍 Chat API Request Debug:', {
      messageCount: messages?.length || 0,
      hasContext: !!context,
      contextTitle: context?.title,
      contextType: context?.type,
      contextContentLength: context?.content?.length || 0,
      documentType,
      hasFileBase64: !!fileBase64,
      fileMimeType: fileMime,
      lastUserMessage: messages[messages.length - 1]?.content
    });
    
    const apiKey = process.env.GOOGLE_GENAI_API_KEY;
    
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "Missing GOOGLE_GENAI_API_KEY" }), 
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.0-flash",
      generationConfig: {
        temperature: 0.2, // Lower temperature for more factual responses
      },
    });

    // Get the latest user message
    const latestMessage = messages[messages.length - 1];
    if (!latestMessage || latestMessage.role !== 'user') {
      return new Response(
        JSON.stringify({ error: "No user message found" }), 
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Prepare context if available
    let documentContext: DocumentContext | null = null;
    if (context) {
      documentContext = {
        title: context.title,
        type: context.type,
        content: context.content,
        source: context.source,
      };
      
      // Truncate content if necessary
      if (documentContext.content && documentContext.content.length > MAX_CONTEXT_LENGTH) {
        documentContext.content = documentContext.content.substring(0, MAX_CONTEXT_LENGTH) + "... [content truncated]";
      }
    }

    const hasPdfFile = fileBase64 && fileMime === 'application/pdf';
    const systemPrompt = getSystemPrompt(documentContext, documentType as 'resume' | 'web', hasPdfFile);
    
    // Log system prompt and content preparation for debugging
    console.log('🤖 AI Context Preparation:', {
      systemPromptLength: systemPrompt.length,
      hasDocumentContext: !!documentContext,
      hasPdfFile,
      documentTypeDetected: documentType
    });
    
    // Prepare content for Gemini
    let content: any[] = [];
    
    // Add system prompt as text
    content.push({ text: systemPrompt });
    
    // Add document context if available
    if (documentContext) {
      content.push({ text: `Document Context (${documentContext.type}): ${documentContext.content}\n\n` });
    }
    
    // Add user question
    content.push({ text: `User Question: ${latestMessage.content}` });
    
    // If we have a PDF file, add it as inline data
    if (fileBase64 && fileMime && fileMime === 'application/pdf') {
      content.push({
        inlineData: {
          data: fileBase64,
          mimeType: fileMime
        }
      });
    }

    const result = await model.generateContent(content);
    const response = await result.response;
    const text = response.text();
    
    // Log successful AI response generation
    console.log('✅ AI Response Generated:', {
      responseLength: text.length,
      responsePreview: text.substring(0, 100) + (text.length > 100 ? '...' : '')
    });
    
    return new Response(JSON.stringify({ reply: text }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    
    console.error('❌ Chat API Error:', {
      error: errorMessage,
      errorType: error instanceof Error ? error.constructor.name : typeof error,
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return new Response(
      JSON.stringify({ 
        error: errorMessage
      }), 
      { 
        status: 500, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  }
}
