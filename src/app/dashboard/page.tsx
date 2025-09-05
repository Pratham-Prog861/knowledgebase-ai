"use client";
import { useState, useEffect } from "react";
import { Card } from "@/components/Card";
import { Modal } from "@/components/Modal";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Plus, Upload, Link as LinkIcon, ArrowRight } from "lucide-react";
import { KnowledgeDocument } from "@/types";

export default function DashboardPage() {
  const { isSignedIn, isLoaded, user } = useUser();
  const router = useRouter();
  const [isUploadOpen, setUploadOpen] = useState(false);
  const [isLinkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkError, setLinkError] = useState("");
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadFileName, setUploadFileName] = useState("");
  const [uploadError, setUploadError] = useState("");
  
  // User plan - default to Free
  const userPlan = "Free";
  
  // Initialize with empty document list
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);

  // Fetch documents from backend when user is authenticated
  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    const fetchDocuments = async () => {
      try {
        const res = await fetch('/api/documents');
        if (!res.ok) {
          let detail = '';
          try {
            const err = await res.json();
            detail = err?.error || JSON.stringify(err);
          } catch {}
          throw new Error(`Failed to fetch documents (${res.status}): ${detail}`);
        }
        const data: KnowledgeDocument[] = await res.json();
        setDocuments(data);
      } catch (error) {
        console.error('Failed to fetch documents:', error);
      }
    };
    fetchDocuments();
  }, [isLoaded, isSignedIn]);
  
  // Calculate counts based on current documents
  const counts = {
    files: documents.filter(doc => doc.type === 'file').length,
    links: documents.filter(doc => doc.type === 'web').length,
    total: documents.length
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

  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Handle adding a new web link (persist to backend)
  const handleAddLink = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!linkUrl.trim()) {
      setLinkError("Please enter a URL");
      return;
    }

    try {
      const url = new URL(linkUrl);
      const response = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: url.hostname, type: 'web', source: linkUrl }),
      });
      if (!response.ok) {
        let detail = '';
        try {
          const err = await response.json();
          detail = err?.message || err?.error || JSON.stringify(err);
        } catch {}
        throw new Error(`Failed to add link (${response.status}): ${detail}`);
      }
      const created: KnowledgeDocument = await response.json();
      setDocuments(prev => [created, ...prev]);
      setLinkUrl("");
      setLinkError("");
      setLinkOpen(false);
    } catch (error) {
      console.error('Error adding link:', error);
      setLinkError("Invalid URL or failed to save. Please enter a valid web address.");
    }
  };

  // Handle file upload (persist to backend)
  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const fileInput = document.getElementById('file-input') as HTMLInputElement;
    const file = fileInput?.files?.[0];
    
    if (!file) {
      setUploadError("Please select a file");
      return;
    }
    
    try {
      // Extract text content for simple text files
      let content: string | undefined = undefined;
      if (file.type === 'text/plain' || file.name.endsWith('.txt') || file.name.endsWith('.md')) {
        content = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsText(file);
        });
      }

      const response = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: uploadTitle || file.name.replace(/\.[^/.]+$/, ""),
          type: 'file',
          source: file.name,
          content,
        }),
      });
      if (!response.ok) {
        let detail = '';
        try {
          const err = await response.json();
          detail = err?.message || err?.error || JSON.stringify(err);
        } catch {}
        throw new Error(`Failed to create document (${response.status}): ${detail}`);
      }
      const created: KnowledgeDocument = await response.json();
      setDocuments(prev => [created, ...prev]);

      setUploadTitle("");
      setUploadFileName("");
      setUploadError("");
      setUploadOpen(false);
      if (fileInput) fileInput.value = '';
    } catch (error) {
      console.error('Error uploading file:', error);
      setUploadError("Failed to upload file. Please try again.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with welcome message and actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-foreground/80">
            Welcome back, <span className="font-medium">{user?.fullName || 'User'}</span>!
          </p>
          <p className="text-sm text-foreground/60">
            Plan: {userPlan} • {user?.primaryEmailAddress?.emailAddress}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <button
            onClick={() => setUploadOpen(true)}
            className="flex items-center gap-2 h-10 px-4 rounded-lg bg-[var(--accent)] text-black text-sm font-medium hover:brightness-95 transition-colors w-full sm:w-auto justify-center"
          >
            <Upload className="h-4 w-4" />
            Upload File
          </button>
          <button
            onClick={() => setLinkOpen(true)}
            className="flex items-center gap-2 h-10 px-4 rounded-lg border border-foreground/10 text-sm font-medium hover:bg-foreground/5 transition-colors w-full sm:w-auto justify-center"
          >
            <LinkIcon className="h-4 w-4" />
            Add Link
          </button>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid sm:grid-cols-3 gap-4">
        <Card className="hover:bg-foreground/5 transition-colors">
          <p className="text-sm text-foreground/70 mb-1">Total Items</p>
          <p className="text-2xl font-semibold">{counts.total}</p>
        </Card>
        <Card className="hover:bg-foreground/5 transition-colors">
          <p className="text-sm text-foreground/70 mb-1">Files</p>
          <p className="text-2xl font-semibold">{counts.files}</p>
        </Card>
        <Card className="hover:bg-foreground/5 transition-colors">
          <p className="text-sm text-foreground/70 mb-1">Links</p>
          <p className="text-2xl font-semibold">{counts.links}</p>
        </Card>
      </div>


      {/* Documents grid */}
      {documents.length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {documents.map((doc) => (
            <Card 
              key={doc.$id} 
              className="hover:shadow-md transition-shadow h-full flex flex-col"
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-medium truncate">{doc.title}</h3>
                <span className="text-xs px-2 py-1 rounded-full bg-foreground/5 text-foreground/70">
                  {doc.type === "file" ? "File" : "Link"}
                </span>
              </div>
              <div className="mt-2 text-sm text-foreground/70 flex-1">
                <p className="truncate mb-2">{doc.source}</p>
                <p className="text-xs text-foreground/50">
                  Added {formatDate(doc.$updatedAt)}
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-foreground/5">
                <a
                  href={`/viewer/${doc.$id}?title=${encodeURIComponent(doc.title)}&source=${encodeURIComponent(doc.source)}&type=${doc.type}`}
                  className="text-sm text-[var(--accent)] hover:underline inline-flex items-center"
                >
                  View details <ArrowRight className="ml-1 h-3.5 w-3.5" />
                </a>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="text-center py-12">
          <div className="mx-auto w-14 h-14 rounded-full bg-foreground/5 flex items-center justify-center mb-4">
            <Plus className="h-6 w-6 text-foreground/40" />
          </div>
          <h3 className="text-lg font-medium text-foreground mb-1">No documents yet</h3>
          <p className="text-foreground/60 max-w-md mx-auto mb-6">
            Get started by uploading a file or adding a web link to your knowledge base.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <button
              onClick={() => setUploadOpen(true)}
              className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-[var(--accent)] text-black text-sm font-medium hover:brightness-95"
            >
              <Upload className="h-3.5 w-3.5" />
              Upload File
            </button>
            <button
              onClick={() => setLinkOpen(true)}
              className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg border border-foreground/10 text-sm font-medium hover:bg-foreground/5"
            >
              <LinkIcon className="h-3.5 w-3.5" />
              Add Link
            </button>
          </div>
        </Card>
      )}

      {/* Upload File Modal */}
      <Modal
        open={isUploadOpen}
        onClose={() => {
          setUploadOpen(false);
          setUploadError("");
          setUploadTitle("");
          setUploadFileName("");
        }}
        title="Upload Document"
      >
        <form onSubmit={handleFileUpload} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="file-input" className="block text-sm font-medium text-foreground/80 mb-1">
              File
            </label>
            <div className="flex items-center gap-3">
              <label 
                htmlFor="file-input"
                className="flex-1 h-10 flex items-center justify-center rounded-lg border-2 border-dashed border-foreground/20 hover:border-[var(--accent)]/50 hover:bg-foreground/5 transition-colors cursor-pointer px-4 py-2 text-sm text-foreground/70"
              >
                {uploadFileName || 'Choose a file...'}
              </label>
              <input
                id="file-input"
                type="file"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  setUploadFileName(file ? file.name : "");
                  setUploadError("");
                }}
                className="hidden"
                accept=".pdf,.txt,.md,.doc,.docx"
              />
            </div>
            <p className="text-xs text-foreground/50 mt-1">
              Supported formats: PDF, TXT, MD, DOC, DOCX (max 10MB)
            </p>
          </div>
          
          <div className="space-y-2">
            <label htmlFor="file-title" className="block text-sm font-medium text-foreground/80 mb-1">
              Title (optional)
            </label>
            <input
              id="file-title"
              type="text"
              value={uploadTitle}
              onChange={(e) => {
                setUploadTitle(e.target.value);
                setUploadError("");
              }}
              placeholder="e.g., Q3 Financial Report"
              className="w-full h-10 rounded-lg border border-foreground/10 bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-[var(--accent)]/50"
            />
            <p className="text-xs text-foreground/50">
              Leave blank to use the filename
            </p>
          </div>
          
          {uploadError && (
            <div className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-md">
              {uploadError}
            </div>
          )}
          
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setUploadOpen(false);
                setUploadError("");
                setUploadTitle("");
                setUploadFileName("");
              }}
              className="h-10 px-4 rounded-lg border border-foreground/10 text-sm font-medium hover:bg-foreground/5 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!uploadFileName}
              className="h-10 px-4 rounded-lg bg-[var(--accent)] text-black text-sm font-medium hover:brightness-95 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Upload Document
            </button>
          </div>
        </form>
      </Modal>

      {/* Add Link Modal */}
      <Modal
        open={isLinkOpen}
        onClose={() => {
          setLinkOpen(false);
          setLinkError("");
          setLinkUrl("");
        }}
        title="Add Web Link"
      >
        <form onSubmit={handleAddLink} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="link-url" className="block text-sm font-medium text-foreground/80 mb-1">
              Web Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <LinkIcon className="h-4 w-4 text-foreground/40" />
              </div>
              <input
                id="link-url"
                type="url"
                value={linkUrl}
                onChange={(e) => {
                  setLinkUrl(e.target.value);
                  setLinkError("");
                }}
                placeholder="https://example.com/article"
                className="w-full h-10 rounded-lg border border-foreground/10 bg-background pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-[var(--accent)]/50"
                required
              />
            </div>
            <p className="text-xs text-foreground/50">
              Enter a valid URL starting with http:// or https://
            </p>
          </div>
          
          {linkError && (
            <div className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-md">
              {linkError}
            </div>
          )}
          
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setLinkOpen(false);
                setLinkError("");
                setLinkUrl("");
              }}
              className="h-10 px-4 rounded-lg border border-foreground/10 text-sm font-medium hover:bg-foreground/5 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!linkUrl.trim()}
              className="h-10 px-4 rounded-lg bg-[var(--accent)] text-black text-sm font-medium hover:brightness-95 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Add Link
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
