// Shared types for KnowledgeBase AI
// Appwrite integration types

import { Models } from "node-appwrite";

export type DocumentType = "file" | "web";

export interface KnowledgeDocument extends Models.Document {
  title: string;
  type: DocumentType;
  source: string; // file name or URL
  content?: string; // document content for AI processing
  userId: string; // Appwrite user ID
}

export interface SearchResult extends Models.Document {
  $id: string;
  question: string;
  answer: string;
  sources: Array<{
    id: string;
    title: string;
    type: DocumentType;
    url?: string;
  }>;
  userId: string;
  timestamp: string;
  $createdAt: string;
  $updatedAt: string;
}

export interface UsageStats {
  $id: string;
  userId: string;
  totalDocuments: number;
  totalFiles: number;
  totalLinks: number;
  queriesThisMonth: number;
  lastUpdated: string;
  $createdAt: string;
  $updatedAt: string;
}

// Appwrite-specific types
export interface AppwriteUser {
  $id: string;
  name: string;
  email: string;
  $createdAt: string;
  $updatedAt: string;
}

// API Response types
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}


