"use client";
import { useState, useEffect } from "react";
import { Card } from "@/components/Card";
import { Modal } from "@/components/Modal";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Plus, Upload, Link as LinkIcon, ArrowRight, Trash2 } from "lucide-react";
import { KnowledgeDocument } from "@/types";
import { ChatPanel } from "@/components/ChatPanel";

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

  // State variables for quick chat
  const [showQuickChat, setShowQuickChat] = useState(false);
  const [uploadedDocument, setUploadedDocument] = useState<KnowledgeDocument | null>(null);

  // Fetch documents from backend when user is authenticated
  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    const fetchDocuments = async () => {
      try {
        const res = await fetch("/api/documents");
        if (!res.ok) {
          let detail = "";
          try {
            const err = await res.json();
            detail = err?.error || JSON.stringify(err);
          } catch {}
          throw new Error(
            `Failed to fetch documents (${res.status}): ${detail}`
          );
        }

        const data: KnowledgeDocument[] = await res.json();
        setDocuments(data);
      } catch (error) {
        console.error("Failed to fetch documents:", error);
      }
    };
    fetchDocuments();
  }, [isLoaded, isSignedIn]);

  // Calculate counts based on current documents
  const counts = {
    files: documents.filter((doc) => doc.type === "file").length,
    links: documents.filter((doc) => doc.type === "web").length,
    total: documents.length,
  };

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push("/");
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
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };
  const handleDelete = async (documentId: string) => {
  if (!confirm("Are you sure you want to delete this document?")) {
    return;
  }

  try {
    const response = await fetch(`/api/documents/${documentId}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      let errorMessage = `Failed to delete document (${response.status})`;
      try {
        const errorData = await response.text();
        errorMessage = errorData || errorMessage;
      } catch {}
      
      if (response.status === 404) {
        alert("Document not found. It may have already been deleted.");
        // Remove from local state anyway
        setDocuments((prev) => prev.filter((doc) => doc.$id !== documentId));
        return;
      }
      
      if (response.status === 403) {
        alert("You don't have permission to delete this document.");
        return;
      }
      
      throw new Error(errorMessage);
    }

    // Remove the document from the state
    setDocuments((prev) => prev.filter((doc) => doc.$id !== documentId));
    alert("Document deleted successfully!");
  } catch (error) {
    console.error("Error deleting document:", error);
    alert("Failed to delete document. Please try again.");
  }
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
      
      // Extract content from the web page
      const contentResponse = await fetch(`/api/fetch-url?url=${encodeURIComponent(linkUrl)}`);
      if (!contentResponse.ok) {
        throw new Error('Failed to fetch URL content');
      }
      
      const { title, content } = await contentResponse.json();
  
      // Create document with extracted content
      const response = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title || url.hostname,
          type: "web",
          source: linkUrl,
          content: content || "",
        }),
      });
  
      if (!response.ok) {
        let detail = "";
        try {
          const err = await response.json();
          detail = err?.message || err?.error || JSON.stringify(err);
        } catch {}
        throw new Error(`Failed to add link (${response.status}): ${detail}`);
      }
  
      const created: KnowledgeDocument = await response.json();
      setDocuments((prev) => [created, ...prev]);
      
      // Set uploaded document and show quick chat
      setUploadedDocument(created);
      setShowQuickChat(true);
      
      setLinkUrl("");
      setLinkError("");
      setLinkOpen(false);
    } catch (error) {
      console.error("Error adding link:", error);
      setLinkError(
        "Invalid URL or failed to save. Please enter a valid web address."
      );
    }
  };

  // Updated handleFileUpload using server-side PDF processing
  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();

    const fileInput = document.getElementById('file-input') as HTMLInputElement;
    const file = fileInput?.files?.[0];

    if (!file) {
      setUploadError("Please select a file");
      return;
    }

    if (!uploadTitle.trim()) {
      setUploadError("Please enter a title for the document");
      return;
    }

    try {
      let content = "";

      // Handle PDF files using server-side processing
      if (file.type === "application/pdf" || file.name.toLowerCase().endsWith('.pdf')) {
        const formData = new FormData();
        formData.append('file', file);

        const extractResponse = await fetch('/api/upload-pdf', {
          method: 'POST',
          body: formData,
        });

        if (!extractResponse.ok) {
          throw new Error('Failed to extract PDF content');
        }

        const extractData = await extractResponse.json();
        content = extractData.text;
      } 
      // Handle text files directly
      else if (file.type.includes('text') || file.name.endsWith('.txt') || file.name.endsWith('.md')) {
        content = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsText(file);
        });
      } else {
        setUploadError("Unsupported file type. Please upload PDF, TXT, or MD files.");
        return;
      }

      // Create document with extracted content
      const response = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: uploadTitle,
          type: 'file',
          source: file.name,
          content: content,
        }),
      });

      if (!response.ok) {
        let detail = "";
        try {
          const err = await response.json();
          detail = err?.message || err?.error || JSON.stringify(err);
        } catch {}
        throw new Error(`Failed to upload file (${response.status}): ${detail}`);
      }

      const created: KnowledgeDocument = await response.json();
      setDocuments((prev) => [created, ...prev]);
      
      // Set uploaded document and show quick chat
      setUploadedDocument(created);
      setShowQuickChat(true);
      
      // Reset form
      setUploadTitle("");
      setUploadFileName("");
      setUploadError("");
      setUploadOpen(false);
      
      // Reset file input
      if (fileInput) fileInput.value = "";

    } catch (error) {
      console.error("Error uploading file:", error);
      setUploadError(error instanceof Error ? error.message : "Failed to upload file");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header with welcome message and actions */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <p className="text-foreground/80 mt-2">
              Welcome back,{" "}
              <span className="font-medium">{user?.fullName || "User"}</span>!
            </p>
            <p className="text-sm text-foreground/60 mt-2">
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
        <div className="grid mt-2 sm:grid-cols-3 gap-4">
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
          <div className="grid mt-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {documents.map((doc) => (
              <Card
                key={doc.$id}
                className="hover:shadow-md transition-shadow h-full flex flex-col"
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-medium truncate flex-1">{doc.title}</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-1 rounded-full bg-foreground/5 text-foreground/70">
                      {doc.type === "file" ? "File" : "Link"}
                    </span>
                    <button
                      onClick={() => handleDelete(doc.$id)}
                      className="text-foreground/50 hover:text-red-500 transition-colors p-1"
                      title="Delete document"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="mt-2 text-sm text-foreground/70 flex-1">
                  <p className="truncate mb-2">{doc.source}</p>
                  <p className="text-xs text-foreground/50">
                    Added {formatDate(doc.$updatedAt)}
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-foreground/5">
                  <a
                    href={`/viewer/${doc.$id}?title=${encodeURIComponent(
                      doc.title
                    )}&source=${encodeURIComponent(doc.source)}&type=${doc.type}`}
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
            <h3 className="text-lg font-medium text-foreground mb-1">
              No documents yet
            </h3>
            <p className="text-foreground/60 max-w-md mx-auto mb-6">
              Get started by uploading a file or adding a web link to your
              knowledge base.
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
        <Modal open={isUploadOpen} onClose={() => setUploadOpen(false)} title="Upload Document">
          <div className="p-6">
            <form onSubmit={handleFileUpload} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Title
                </label>
                <input
                  type="text"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                  placeholder="Enter document title"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  File
                </label>
                <input
                  id="file-input"
                  type="file"
                  accept=".pdf,.txt,.md"
                  onChange={(e) => setUploadFileName(e.target.files?.[0]?.name || "")}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                  required
                />
              </div>
              {uploadError && (
                <p className="text-sm text-red-500">{uploadError}</p>
              )}
              <div className="flex gap-3">
                <button
                  type="submit"
                  className="flex-1 bg-[var(--accent)] text-white px-4 py-2 rounded-lg font-medium hover:bg-[var(--accent)]/90 transition-colors"
                >
                  Upload
                </button>
                <button
                  type="button"
                  onClick={() => setUploadOpen(false)}
                  className="flex-1 border border-border px-4 py-2 rounded-lg font-medium hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </Modal>
          
        <Modal open={isLinkOpen} onClose={() => setLinkOpen(false)} title="Add Web Link">
          <div className="p-6">
            <form onSubmit={handleAddLink} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  URL
                </label>
                <input
                  type="url"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                  placeholder="https://example.com"
                  required
                />
              </div>
              {linkError && (
                <p className="text-sm text-red-500">{linkError}</p>
              )}
              <div className="flex gap-3">
                <button
                  type="submit"
                  className="flex-1 bg-[var(--accent)] text-white px-4 py-2 rounded-lg font-medium hover:bg-[var(--accent)]/90 transition-colors"
                >
                  Add Link
                </button>
                <button
                  type="button"
                  onClick={() => setLinkOpen(false)}
                  className="flex-1 border border-border px-4 py-2 rounded-lg font-medium hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </Modal>
      </div>
    </div>
  );
}
