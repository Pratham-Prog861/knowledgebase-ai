"use client";
import { useEffect, useState } from "react";
import { ChatPanel } from "@/components/ChatPanel";

interface Props {
  docId: string;
  title: string;
}

interface DocumentData {
  $id: string;
  title: string;
  type: 'file' | 'web';
  source: string;
  content: string;
  $createdAt: string;
  $updatedAt: string;
}

export default function ViewerClient({ docId, title }: Props) {
  const [document, setDocument] = useState<DocumentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processedContent, setProcessedContent] = useState<{
    textContent: string;
    fileData?: {
      base64: string;
      mimeType: string;
      fileName: string;
    };
  }>({ textContent: '' });

  useEffect(() => {
    const fetchDocument = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/documents/${docId}`);
        
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Document not found');
          }
          throw new Error(`Failed to fetch document: ${response.status}`);
        }
        
        const data: DocumentData = await response.json();
        setDocument(data);
        
        // Process document content
        let textContent = data.content || '';
        let fileData = undefined;
        
        // Check if content contains embedded PDF data
        if (data.content) {
          try {
            const parsed = JSON.parse(data.content);
            if (parsed.type === 'pdf' && parsed.fileData) {
              textContent = parsed.textContent || '';
              fileData = parsed.fileData;
              console.log('Loaded PDF document with file data:', {
                fileName: fileData.fileName,
                base64Length: fileData.base64?.length
              });
            }
          } catch (e) {
            // Not JSON, treat as regular text content
            textContent = data.content;
          }
        }
        
        setProcessedContent({ textContent, fileData });
        console.log('Document loaded successfully:', {
          id: data.$id,
          title: data.title,
          type: data.type,
          contentLength: textContent.length,
          hasPDFData: !!fileData
        });
        
      } catch (err) {
        console.error('Error fetching document:', err);
        setError(err instanceof Error ? err.message : 'Failed to load document');
      } finally {
        setLoading(false);
      }
    };
    
    if (docId) {
      fetchDocument();
    }
  }, [docId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[30rem]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent mx-auto mb-4"></div>
          <p className="text-foreground/60">Loading document...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[30rem]">
        <div className="text-center">
          <div className="text-destructive mb-4">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-foreground mb-2">Failed to load document</h3>
          <p className="text-foreground/60 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-accent text-accent-foreground rounded-lg hover:bg-accent/90"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="flex items-center justify-center min-h-[30rem]">
        <div className="text-center">
          <p className="text-foreground/60">Document not found</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Document Info */}
      <div className="mb-4 p-4 bg-foreground/5 rounded-lg">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-lg">{document.type === 'file' ? '📄' : '🌐'}</span>
          <h2 className="font-medium">{document.title}</h2>
        </div>
        <p className="text-sm text-foreground/60 mb-2">{document.source}</p>
        <div className="text-xs text-foreground/50">
          Content: {processedContent.textContent.length} characters
          {processedContent.fileData && (
            <span className="ml-2">
              | PDF Data: {Math.round(processedContent.fileData.base64.length / 1024)}KB
            </span>
          )}
        </div>
      </div>
      
      {/* Chat Panel */}
      <div className="w-full h-[30rem]">
        <ChatPanel
          document={{
            id: document.$id,
            title: document.title,
            type: document.type,
            source: document.source
          }}
          contextTitle={processedContent.textContent ? 
            `${document.title}\n\n${processedContent.textContent.slice(0, 8000)}` : 
            document.title
          }
          fileBase64={processedContent.fileData?.base64}
          fileMime={processedContent.fileData?.mimeType}
        />
      </div>
    </div>
  );
}
