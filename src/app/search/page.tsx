"use client";
import { useState, useEffect } from "react";
import { Card } from "@/components/Card";
import { SearchBox } from "@/components/SearchBox";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Loader2, Search, ExternalLink } from "lucide-react";

// Type definitions
interface Document {
  id: string;
  title: string;
  type: 'file' | 'web';
  source: string;
  lastUpdated: string;
}

interface Source {
  url: string;
  title: string;
  content?: string;
}

interface SearchResults {
  answer: string;
  sources: Source[];
}

export default function SearchPage() {
  const { isSignedIn, isLoaded } = useUser();
  const router = useRouter();
  const [query, setQuery] = useState<string>("");
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchResults, setSearchResults] = useState<SearchResults | null>(null);
  
  // Function to extract main content from HTML
  const extractMainContent = (html: string): string => {
    try {
      // Simple HTML to text conversion
      const doc = new DOMParser().parseFromString(html, 'text/html');
      
      // Remove script and style elements
      const scripts = doc.querySelectorAll('script, style, nav, header, footer');
      scripts.forEach(script => script.remove());
      
      // Get text content
      const text = doc.body?.textContent || '';
      
      // Clean up whitespace and newlines
      const cleanedText = text.replace(/\s+/g, ' ').trim();
      
      // Return first 2000 characters for demo purposes
      return cleanedText.length > 2000 
        ? cleanedText.substring(0, 2000) + '...' 
        : cleanedText;
    } catch (error) {
      console.error('Error extracting content:', error);
      return 'Could not extract content from this page.';
    }
  };
  
  // Function to fetch and process URL content
  const fetchUrlContent = async (url: string): Promise<Source> => {
    try {
      const response = await fetch(`/api/fetch-url?url=${encodeURIComponent(url)}`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      
      const data = await response.json();
      return {
        url,
        title: data.title || new URL(url).hostname,
        content: extractMainContent(data.content || '')
      };
    } catch (error) {
      console.error('Error fetching URL:', error);
      return {
        url,
        title: new URL(url).hostname,
        content: 'Could not fetch content from this URL.'
      };
    }
  };

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push('/');
    }
  }, [isLoaded, isSignedIn, router]);

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent)] mx-auto mb-4"></div>
          <p className="text-foreground/60">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isSignedIn) {
    return null;
  }

  async function handleSubmit(value: string) {
    if (!value.trim()) return;
    
    setQuery(value);
    setIsSearching(true);
    
    try {
      // Check if the query is asking about services
      const isServiceQuestion = /services?|products?|offerings?/i.test(value);
      
      if (isServiceQuestion) {
        // Get all web links from the knowledge base
        const response = await fetch('/api/documents?type=web');
        if (!response.ok) throw new Error('Failed to fetch documents');
        
        const documents: Document[] = await response.json();
        
        if (documents.length === 0) {
          setSearchResults({
            answer: "I couldn't find any web links in your knowledge base to check for services. Please add some web links first.",
            sources: []
          });
          return;
        }
        
        // Fetch content from the first few URLs
        const sources = await Promise.all(
          documents
            .slice(0, 3)
            .map(doc => fetchUrlContent(doc.source))
        );
        
        // Generate a response based on the content
        const answer = generateServiceResponse(sources);
        
        setSearchResults({
          answer,
          sources: sources.filter(s => s.content)
        });
      } else {
        // Regular search functionality
        const response = await fetch('/api/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: value })
        });
        
        if (!response.ok) throw new Error('Search failed');
        
        const data: SearchResults = await response.json();
        setSearchResults(data);
      }
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults({
        answer: "I'm sorry, I encountered an error while processing your request. Please try again later.",
        sources: []
      });
    } finally {
      setIsSearching(false);
    }
  }
  
  // Generate a response about services based on the fetched content
  const generateServiceResponse = (sources: Source[]): string => {
    // Extract service-related information from the content
    const serviceKeywords = ['service', 'product', 'solution', 'offering'];
    
    // Find relevant information from each source
    const serviceInfo = sources
      .map(source => {
        if (!source.content) return null;
        
        const content = source.content.toLowerCase();
        let info = '';
        
        // Look for sections that mention services
        const serviceSections = content.split(/\n\s*\n/).filter(section => 
          serviceKeywords.some(keyword => section.includes(keyword))
        );
        
        if (serviceSections.length > 0) {
          info = serviceSections[0].substring(0, 500);
        } else if (content.length > 0) {
          // If no specific service section found, use the beginning of the content
          info = content.substring(0, 500);
        }
        
        return info ? {
          title: source.title,
          url: source.url,
          info: info
        } : null;
      })
      .filter((item): item is { title: string; url: string; info: string } => item !== null);
    
    if (serviceInfo.length === 0) {
      return "I couldn't find specific information about services on the provided websites. " +
             "Here are the links you might want to check directly: " +
             sources.map(s => s.url).join(', ');
    }
    
    // Build the response
    let response = "Here's what I found about their services:\n\n";
    
    serviceInfo.forEach(item => {
      response += `**${item.title}** (${item.url}):\n`;
      response += `${item.info}...\n\n`;
    });
    
    response += "\n*Note: This is an automated summary. For complete information, please visit the websites directly.*";
    
    return response;
  };

  return (
    <div>
      <div className="space-y-6">
        <h1 className="text-xl font-semibold">Search</h1>
        <SearchBox
          onSubmit={handleSubmit}
          placeholder="Ask anything about your knowledge base..."
        />

        {isSearching ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-[var(--accent)] mb-4" />
            <p className="text-foreground/70">Searching your knowledge base...</p>
          </div>
        ) : searchResults ? (
          <div className="space-y-6">
            <Card className="lg:col-span-2" title="Search Results">
              <div className="space-y-4">
                <div className="p-4 bg-foreground/5 rounded-lg">
                  <p className="text-sm font-medium text-foreground/70 mb-1">Your question:</p>
                  <p className="text-foreground">&ldquo;{query}&rdquo;</p>
                </div>
                <div className="p-4 bg-foreground/5 rounded-lg">
                  <p className="text-sm font-medium text-foreground/70 mb-2">AI Response:</p>
                  <p className="text-base leading-7">{searchResults.answer}</p>
                </div>
              </div>
            </Card>
            
            {searchResults.sources.length > 0 && (
              <Card title="Sources">
                <div className="space-y-3">
                  {searchResults.sources.map((source, index) => (
                    <div key={index} className="p-3 bg-foreground/5 rounded-lg">
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium text-foreground hover:text-[var(--accent)] flex items-center gap-1"
                      >
                        {source.title}
                        <ExternalLink className="h-3 w-3 ml-1 opacity-70" />
                      </a>
                      <p className="text-sm text-foreground/70 mt-1 line-clamp-3">
                        {source.content}
                      </p>
                    </div>
                  ))}
                </div>
              </Card>
            )}
            
            <div className="text-center">
              <button
                onClick={() => setSearchResults(null)}
                className="inline-flex items-center text-sm text-foreground/70 hover:text-foreground transition-colors"
              >
                <Search className="h-4 w-4 mr-1.5" />
                New search
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="mx-auto w-12 h-12 rounded-full bg-foreground/5 flex items-center justify-center mb-4">
              <Search className="h-5 w-5 text-foreground/50" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-1">Search your knowledge base</h3>
            <p className="text-foreground/60 max-w-md mx-auto">
              Ask a question in natural language and find relevant information from your documents.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
