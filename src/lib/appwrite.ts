import { Client, Databases, Storage, Account, ID, Query } from 'appwrite';

// Initialize Appwrite client
const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!);

// Initialize services
export const databases = new Databases(client);
export const storage = new Storage(client);
export const account = new Account(client);

// Database and Collection IDs
export const DATABASE_ID = 'knowledgebase';
export const DOCUMENTS_COLLECTION_ID = 'documents';
export const SEARCH_RESULTS_COLLECTION_ID = 'search_results';
export const USAGE_STATS_COLLECTION_ID = 'usage_stats';

// Storage Bucket ID
export const FILES_BUCKET_ID = 'knowledge_files';

// Helper function to get user ID from session
export const getCurrentUser = async () => {
  try {
    return await account.get();
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
};

// Helper function to create document
export const createDocument = async (data: {
  title: string;
  type: 'file' | 'web';
  source: string;
  content?: string;
  userId: string;
}) => {
  return await databases.createDocument(
    DATABASE_ID,
    DOCUMENTS_COLLECTION_ID,
    ID.unique(),
    {
      ...data,
      lastUpdated: new Date().toISOString(),
    }
  );
};

// Helper function to get user documents
export const getUserDocuments = async (userId: string, type?: 'file' | 'web') => {
  const queries = [Query.equal('userId', userId)];
  
  if (type) {
    queries.push(Query.equal('type', type));
  }
  
  return await databases.listDocuments(
    DATABASE_ID,
    DOCUMENTS_COLLECTION_ID,
    queries
  );
};

// Helper function to update document
export const updateDocument = async (documentId: string, data: Partial<{
  title: string;
  content: string;
  lastUpdated: string;
}>) => {
  return await databases.updateDocument(
    DATABASE_ID,
    DOCUMENTS_COLLECTION_ID,
    documentId,
    data
  );
};

// Helper function to delete document
export const deleteDocument = async (documentId: string) => {
  return await databases.deleteDocument(
    DATABASE_ID,
    DOCUMENTS_COLLECTION_ID,
    documentId
  );
};

// Helper function to save search result
export const saveSearchResult = async (data: {
  question: string;
  answer: string;
  sources: Array<{
    id: string;
    title: string;
    type: 'file' | 'web';
    url?: string;
  }>;
  userId: string;
}) => {
  return await databases.createDocument(
    DATABASE_ID,
    SEARCH_RESULTS_COLLECTION_ID,
    ID.unique(),
    {
      ...data,
      timestamp: new Date().toISOString(),
    }
  );
};

// Helper function to get user search history
export const getUserSearchHistory = async (userId: string, limit: number = 10) => {
  return await databases.listDocuments(
    DATABASE_ID,
    SEARCH_RESULTS_COLLECTION_ID,
    [
      Query.equal('userId', userId),
      Query.orderDesc('timestamp'),
      Query.limit(limit)
    ]
  );
};

// Helper function to update usage stats
export const updateUsageStats = async (userId: string, stats: {
  totalDocuments?: number;
  totalFiles?: number;
  totalLinks?: number;
  queriesThisMonth?: number;
}) => {
  try {
    // Try to get existing stats
    const existingStats = await databases.listDocuments(
      DATABASE_ID,
      USAGE_STATS_COLLECTION_ID,
      [Query.equal('userId', userId)]
    );

    if (existingStats.documents.length > 0) {
      // Update existing stats
      const existingDoc = existingStats.documents[0];
      return await databases.updateDocument(
        DATABASE_ID,
        USAGE_STATS_COLLECTION_ID,
        existingDoc.$id,
        {
          ...stats,
          lastUpdated: new Date().toISOString(),
        }
      );
    } else {
      // Create new stats document
      return await databases.createDocument(
        DATABASE_ID,
        USAGE_STATS_COLLECTION_ID,
        ID.unique(),
        {
          userId,
          totalDocuments: 0,
          totalFiles: 0,
          totalLinks: 0,
          queriesThisMonth: 0,
          ...stats,
          lastUpdated: new Date().toISOString(),
        }
      );
    }
  } catch (error) {
    console.error('Error updating usage stats:', error);
    throw error;
  }
};

// Helper function to get usage stats
export const getUsageStats = async (userId: string) => {
  try {
    const result = await databases.listDocuments(
      DATABASE_ID,
      USAGE_STATS_COLLECTION_ID,
      [Query.equal('userId', userId)]
    );

    if (result.documents.length > 0) {
      return result.documents[0];
    }

    // Return default stats if none exist
    return {
      totalDocuments: 0,
      totalFiles: 0,
      totalLinks: 0,
      queriesThisMonth: 0,
    };
  } catch (error) {
    console.error('Error getting usage stats:', error);
    return {
      totalDocuments: 0,
      totalFiles: 0,
      totalLinks: 0,
      queriesThisMonth: 0,
    };
  }
};

export default client;
