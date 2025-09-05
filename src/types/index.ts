// Shared types for KnowledgeBase AI
// Integrations: Replace mock sources with Supabase/Appwrite records later.

export type DocumentType = "file" | "web";

export interface KnowledgeDocument {
  id: string;
  title: string;
  type: DocumentType;
  source: string; // file name or URL
  lastUpdated: string; // ISO string for simplicity
}

export interface SearchResult {
  id: string;
  question: string;
  answer: string;
  sources: Array<{
    id: string;
    title: string;
    type: DocumentType;
    url?: string;
  }>;
}

export interface UsageStats {
  totalDocuments: number;
  totalFiles: number;
  totalLinks: number;
  queriesThisMonth: number;
}


