"use client";
import { useState, useRef, useEffect } from "react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface ChatPanelProps {
  document?: {
    id: string;
    title: string;
    type: 'file' | 'web';
    source: string;
  } | null;
  contextTitle?: string;
  fileBase64?: string;
  fileMime?: string;
  className?: string;
}

export function ChatPanel({ 
  document,
  contextTitle,
  fileBase64,
  fileMime,
  className = ''
}: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>(() => {
    let initialContent = "You can ask me questions about the current document or any other topic.";
    
    if (contextTitle) {
      const title = contextTitle.split('\n')[0] || 'Document';
      const type = fileBase64 ? 'document' : 'web page';
      initialContent = `Ask me anything about this ${type}: ${title}`;
    } else if (document) {
      initialContent = `Ask me anything about this ${document.type === 'file' ? 'document' : 'web page'}: ${document.title}`;
    }
    
    return [
      {
        id: "m-0",
        role: "assistant",
        content: initialContent,
        timestamp: new Date(),
      },
    ];
  });
  
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [documentContent, setDocumentContent] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  
  // Load document content if document ID is provided
  useEffect(() => {
    const loadDocumentContent = async () => {
      if (!document?.id) return;
      
      try {
        const response = await fetch(`/api/documents/${document.id}`);
        if (response.ok) {
          const data = await response.json();
          setDocumentContent(data.content || null);
        }
      } catch (error) {
        console.error('Error loading document content:', error);
      }
    };
    
    loadDocumentContent();
  }, [document?.id]);

  function scrollToBottom() {
    requestAnimationFrame(() => {
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
    });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const value = input.trim();
    if (!value || isLoading) return;

    const userMsg: Message = {
      id: `m-${Date.now()}-u`,
      role: "user",
      content: value,
      timestamp: new Date(),
    };
    
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);
    setError("");
    
    // Auto-scroll to bottom when new message is added
    setTimeout(scrollToBottom, 100);

    try {
      // Prepare the context based on available data
      let context = null;
      let documentType = 'general';
      
      if (contextTitle) {
        // Extract title and content from contextTitle
        const lines = contextTitle.split('\n');
        const title = lines[0] || 'Document';
        const content = lines.slice(2).join('\n') || contextTitle;
        
        context = {
          title: title,
          type: fileBase64 ? 'file' : 'web',
          content: content,
          source: 'Uploaded content'
        };
        documentType = fileBase64 ? 'file' : 'web';
      } else if (document) {
        context = {
          title: document.title,
          type: document.type,
          content: documentContent || '',
          source: document.source
        };
        documentType = document.type;
      }

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            ...messages,
            { role: 'user' as const, content: input }
          ],
          context,
          documentType,
          fileBase64,
          fileMime
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Request failed: ${response.status}`);
      }
      
      const data = await response.json();
      const reply: Message = {
        id: `m-${Date.now()}-a`,
        role: "assistant",
        content: data.reply || "I'm not sure how to respond to that.",
        timestamp: new Date(),
      };
      
      setMessages((prev) => [...prev, reply]);
      scrollToBottom();
      
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMessage);
      
      // Add error message to chat
      const errorReply: Message = {
        id: `m-${Date.now()}-e`,
        role: "assistant",
        content: `I'm sorry, I encountered an error: ${errorMessage}`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorReply]);
    } finally {
      setIsLoading(false);
      scrollToBottom();
    }
  }

  // Format message timestamp with deterministic formatting
  function formatTime(timestamp: Date): string {
    const formatter = new Intl.DateTimeFormat("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
      timeZone: "UTC",
    });
    return formatter.format(timestamp);
  };

  return (
    <div className={`flex h-full flex-col rounded-2xl border border-white/10 bg-[color:rgba(255,255,255,0.02)] ${className}`}>
      {/* Chat header with document info */}
      {(document || contextTitle) && (
        <div className="border-b border-white/10 p-3 bg-[color:rgba(255,255,255,0.03)]">
          <h3 className="font-medium text-sm text-white/90 truncate">
            {fileBase64 ? '📄' : '🌐'} {contextTitle ? contextTitle.split('\n')[0] : document?.title}
          </h3>
          <p className="text-xs text-white/60 truncate">
            {contextTitle ? 'Uploaded content' : document?.source}
          </p>
        </div>
      )}
      
      {/* Messages container */}
      <div ref={listRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((m) => (
          <div 
            key={m.id} 
            className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-[85%] ${m.role === 'user' ? 'ml-auto' : 'mr-auto'}`}>
              <div 
                className={`inline-block rounded-2xl px-4 py-2 text-sm ${
                  m.role === 'user'
                    ? 'bg-[var(--accent)] text-black rounded-br-none'
                    : 'bg-[color:rgba(255,255,255,0.03)] text-white border border-white/10 rounded-bl-none'
                }`}
              >
                <div className="whitespace-pre-wrap">{m.content}</div>
                <div className={`text-xs mt-1 text-right ${m.role === 'user' ? 'text-black/60' : 'text-white/40'}`}>
                  {formatTime(m.timestamp)}
                </div>
              </div>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="max-w-[85%] bg-[color:rgba(255,255,255,0.03)] text-white rounded-2xl rounded-bl-none px-4 py-2 text-sm border border-white/10">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </div>
        )}
        
        {error && (
          <div className="text-red-400 text-sm p-3 rounded-lg bg-red-900/20 border border-red-800/50">
            ⚠️ {error}
          </div>
        )}
      </div>

      {/* Input area */}
      <form onSubmit={onSubmit} className="p-4 border-t border-white/10 bg-[color:rgba(255,255,255,0.02)]">
        <div className="relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              contextTitle 
                ? `Ask about ${contextTitle.split('\n')[0]}...`
                : document 
                  ? `Ask about ${document.title}...`
                  : "Type a message..."
            }
            className="w-full rounded-xl border border-white/10 bg-[color:rgba(255,255,255,0.03)] px-4 pr-12 py-3 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-opacity-50"
            disabled={isLoading}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                onSubmit(e);
              }
            }}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full ${
              isLoading || !input.trim() 
                ? 'text-white/30' 
                : 'text-[var(--accent)] hover:bg-white/5'
            }`}
            aria-label="Send message"
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              width="20" 
              height="20" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
              className="transform rotate-90"
            >
              <path d="M12 19V5"></path>
              <path d="M5 12l7-7 7 7"></path>
            </svg>
          </button>
        </div>
        
        {(document || contextTitle) && (
          <div className="mt-2 text-xs text-white/50 text-center">
            Ask about this {fileBase64 ? 'document' : 'web page'} or any other topic
          </div>
        )}
      </form>
    </div>
  );
}
