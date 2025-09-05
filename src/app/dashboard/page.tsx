"use client";
"use client";
import { useState, useEffect } from "react";
import { Card } from "@/components/Card";
import { Modal } from "@/components/Modal";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Plus, Upload, Link as LinkIcon, Search, ArrowRight } from "lucide-react";

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
  const [documents, setDocuments] = useState<Array<{
    id: string;
    title: string;
    type: 'file' | 'web';
    source: string;
    lastUpdated: string;
  }>>([]);

  // Load documents from localStorage on component mount
  useEffect(() => {
    try {
      const savedDocs = localStorage.getItem('kbai:documents');
      if (savedDocs) {
        setDocuments(JSON.parse(savedDocs));
      }
    } catch (error) {
      console.error('Failed to load documents:', error);
    }
  }, []);

  // Save documents to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('kbai:documents', JSON.stringify(documents));
    } catch (error) {
      console.error('Failed to save documents:', error);
    }
  }, [documents]);
  
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

  // Handle adding a new web link
  const handleAddLink = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!linkUrl.trim()) {
      setLinkError("Please enter a URL");
      return;
    }

    try {
      // In a real app, you would make an API call to save the link
      // const response = await fetch('/api/links', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ url: linkUrl })
      // });
      // const data = await response.json();
      
      try {
        const url = new URL(linkUrl);
        const newDoc = {
          id: `doc-${Date.now()}`,
          title: url.hostname,
          type: 'web' as const,
          source: linkUrl,
          lastUpdated: new Date().toISOString()
        };
        
        // Update state and show success message
        setDocuments(prev => [newDoc, ...prev]);
        // alert(`Successfully added link: ${newDoc.title}`);
      } catch (error) {
        console.error('Error adding link:', error);
        setLinkError("Invalid URL. Please enter a valid web address starting with http:// or https://");
        return;
      }
      setLinkUrl("");
      setLinkError("");
      setLinkOpen(false);
    } catch (error) {
      console.error('Error adding link:', error);
      setLinkError("Invalid URL. Please enter a valid web address.");
    }
  };

  // Handle file upload
  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const fileInput = document.getElementById('file-input') as HTMLInputElement;
    const file = fileInput?.files?.[0];
    
    if (!file) {
      setUploadError("Please select a file");
      return;
    }
    
    try {
      // Convert file to base64 for storage
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          // Remove data URL prefix to get just the base64 string
          const base64String = result.split(',')[1];
          resolve(base64String);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      
      // Create new document
      const newDoc = {
        id: `doc-${Date.now()}`,
        title: uploadTitle || file.name.replace(/\.[^/.]+$/, ""),
        type: 'file' as const,
        source: file.name,
        lastUpdated: new Date().toISOString()
      };
      
      // Store file content in localStorage for AI analysis
      const docId = newDoc.id;
      localStorage.setItem(`kbai:doc:${docId}:file`, base64);
      localStorage.setItem(`kbai:doc:${docId}:mime`, file.type);
      
      // For PDFs, we'll let the AI analyze the file directly
      // For text files, we can extract text content
      if (file.type === 'text/plain' || file.name.endsWith('.txt') || file.name.endsWith('.md')) {
        const textContent = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsText(file);
        });
        localStorage.setItem(`kbai:doc:${docId}:text`, textContent);
      }
      
      // Update state and show success message
      setDocuments(prev => [newDoc, ...prev]);
      
      setUploadTitle("");
      setUploadFileName("");
      setUploadError("");
      setUploadOpen(false);
      
      // Reset file input
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

      {/* Search bar */}
      <div className="relative">
        <input
          className="w-full h-12 rounded-lg border border-foreground/10 bg-background pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-[var(--accent)]/50 transition-all"
          placeholder="Search your knowledge base..."
          disabled
        />
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/50" />
      </div>

      {/* Documents grid */}
      {documents.length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {documents.map((doc) => (
            <Card 
              key={doc.id} 
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
                  Added {formatDate(doc.lastUpdated)}
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-foreground/5">
                <a
                  href={`/viewer/${doc.id}?title=${encodeURIComponent(doc.title)}&source=${encodeURIComponent(doc.source)}&type=${doc.type}`}
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
