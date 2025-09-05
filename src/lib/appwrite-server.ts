import { Client, Databases, Storage } from 'node-appwrite';

const endpoint = process.env.APPWRITE_ENDPOINT || process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
const projectId = process.env.APPWRITE_PROJECT_ID || process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
const apiKey = process.env.APPWRITE_API_KEY;

if (!endpoint || !projectId) {
  throw new Error('Missing APPWRITE_ENDPOINT or APPWRITE_PROJECT_ID environment variables');
}

// Use API key only on the server
if (!apiKey) {
  // We avoid throwing at import time in serverless, but warn to help diagnosis
  console.warn('APPWRITE_API_KEY is not set. Server-side Appwrite operations will fail.');
}

const serverClient = new Client()
  .setEndpoint(endpoint)
  .setProject(projectId);

if (apiKey) {
  serverClient.setKey(apiKey);
}

export const databasesServer = new Databases(serverClient);
export const storageServer = new Storage(serverClient);

export const DATABASE_ID = 'knowledgebase';
// SQL Tables (Rows API)
export const DOCUMENTS_TABLE_ID = 'documents';
export const SEARCH_RESULTS_TABLE_ID = 'search_results';
export const USAGE_STATS_TABLE_ID = 'usage_stats';
