/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useState, useEffect } from "react";
import { Card } from "@/components/Card";
import { Modal } from "@/components/Modal";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Plus, Upload, Link as LinkIcon, ArrowRight, CheckCircle, XCircle } from "lucide-react";
import { KnowledgeDocument } from "@/types";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { ChatPanel } from "@/components/ChatPanel";

export default function DashboardPage() {
  const { isSignedIn, isLoaded, user } = useUser();
  const router = useRouter();
  const [isUploadOpen, setUploadOpen] = useState(false);
  const [isLinkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkError, setLinkError] = useState("");
  const [uploadTitle, setUploadTitle] = useState("");
  const [ , setUploadFileName] = useState("");
  const [uploadError, setUploadError] = useState("");

  // User plan - default to Free
  const userPlan = "Free";

  // Initialize with empty document list
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);

  // State variables for quick chat
  const [showQuickChat, setShowQuickChat] = useState(false);
  const [uploadedDocument, setUploadedDocument] = useState<KnowledgeDocument | null>(null);
  
  // Toast notification state
  const [toast, setToast] = useState<{
    message: string;
    type: 'success' | 'error';
  } | null>(null);
  
  // Auto-hide toast after 3 seconds
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

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
          setToast({
            message: "Document not found. It may have already been deleted.",
            type: 'error'
          });
          // Remove from local state anyway
          setDocuments((prev) => prev.filter((doc) => doc.$id !== documentId));
          return;
        }
        
        if (response.status === 403) {
          setToast({
            message: "You don't have permission to delete this document.",
            type: 'error'
          });
          return;
        }
        
        throw new Error(errorMessage);
      }

      // Remove the document from the state
      setDocuments((prev) => prev.filter((doc) => doc.$id !== documentId));
      setToast({
        message: "Document deleted successfully!",
        type: 'success'
      });
    } catch (error) {
      console.error("Error deleting document:", error);
      setToast({
        message: "Failed to delete document. Please try again.",
        type: 'error'
      });
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
      console.log('Fetching content for URL:', linkUrl);
      const contentResponse = await fetch(`/api/fetch-url?url=${encodeURIComponent(linkUrl)}`);
      
      if (!contentResponse.ok) {
        const errorText = await contentResponse.text();
        console.error('Failed to fetch URL content:', errorText);
        throw new Error(`Failed to fetch URL content: ${contentResponse.status}`);
      }
      
      const responseData = await contentResponse.json();
      console.log('Received content data:', {
        title: responseData.title,
        contentLength: responseData.content?.length || 0,
        hasWarning: !!responseData.warning
      });
      
      const { title, content, description, warning } = responseData;
      
      // Show warning if content extraction had issues
      if (warning) {
        setLinkError(`Warning: ${warning}`);
        // Clear error after 5 seconds to allow user to continue
        setTimeout(() => setLinkError(''), 5000);
      }
  
      // Prepare content for storage
      let finalContent = content || '';
      if (description && description.trim()) {
        finalContent = `${description}\n\n${finalContent}`;
      }
      
      // Ensure we have some content to store
      if (!finalContent.trim()) {
        finalContent = `Web page: ${title}\nURL: ${linkUrl}\n\n[Content could not be extracted automatically. Please visit the URL directly to view the content.]`;
      }
      
      console.log('Creating document with content length:', finalContent.length);
      
      // Create document with extracted content
      const response = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title || url.hostname,
          type: "web",
          source: linkUrl,
          content: finalContent,
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
      let extractData: any = null; // Declare extractData in the outer scope

      // Handle PDF files using server-side processing
      if (file.type === "application/pdf" || file.name.toLowerCase().endsWith('.pdf')) {
        const formData = new FormData();
        formData.append('file', file);

        const extractResponse = await fetch('/api/upload-pdf', {
          method: 'POST',
          body: formData,
        });

        if (!extractResponse.ok) {
          const errorText = await extractResponse.text();
          console.error('PDF extraction failed:', errorText);
          throw new Error(`Failed to extract PDF content: ${extractResponse.status} - ${errorText}`);
        }

        extractData = await extractResponse.json(); // Assign to the outer scope variable
        content = extractData.text;
        
        console.log('PDF upload response:', {
          hasBase64: !!extractData.base64Data,
          fileName: extractData.fileName,
          fileSize: extractData.fileSize
        });
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

      // Prepare document data
      const documentData: any = {
        title: uploadTitle,
        type: 'file',
        source: file.name,
        content: content,
      };
      
      // For PDF files, embed the base64 data in the content for AI processing
      if (extractData && extractData.base64Data) {
        documentData.content = JSON.stringify({
          type: 'pdf',
          textContent: content,
          fileData: {
            base64: extractData.base64Data,
            mimeType: extractData.mimeType,
            fileName: extractData.fileName,
            fileSize: extractData.fileSize
          }
        });
        console.log('Storing PDF with embedded base64 data');
      }
      
      console.log('Creating document with PDF data:', {
        title: documentData.title,
        hasFileData: !!documentData.fileData
      });
      
      // Create document with extracted content
      const response = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(documentData),
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
              className="flex items-center gap-2 h-10 px-4 rounded-lg bg-accent text-accent-foreground text-sm font-medium hover:bg-accent/90 transition-colors w-full sm:w-auto justify-center"
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
                    <DeleteConfirmDialog
                      title="Document"
                      onConfirm={() => handleDelete(doc.$id)}
                      triggerVariant="ghost"
                      triggerClassName="text-foreground/50 hover:text-red-500 transition-colors p-1 h-8 w-8"
                    />
                  </div>
                </div>
                <div className="mt-2 text-sm text-foreground/70 flex-1">
                  <p className="truncate mb-2">{doc.source}</p>
                  <p className="text-xs text-foreground/50">
                    Added {formatDate(doc.$updatedAt)}
                  </p>
                  {/* Debug info for PDF files */}
                  {doc.content && (() => {
                    try {
                      // Only attempt JSON parsing if content looks like JSON (starts with { or [)
                      const trimmedContent = doc.content.trim();
                      if (trimmedContent.startsWith('{') || trimmedContent.startsWith('[')) {
                        const parsed = JSON.parse(doc.content);
                        if (parsed.type === 'pdf') {
                          return (
                            <p className="text-xs text-accent mt-1">
                              📄 PDF with {Math.round(parsed.fileData?.base64?.length / 1024)}KB data
                            </p>
                          );
                        }
                      }
                    } catch (e) {
                      // Silently ignore JSON parsing errors for non-JSON content
                      // This is expected for plain text documents
                    }
                    return null;
                  })()} 
                </div>
                <div className="mt-4 pt-3 border-t border-foreground/5 flex justify-between items-center">
                  <a
                    href={`/viewer/${doc.$id}?title=${encodeURIComponent(
                      doc.title
                    )}&source=${encodeURIComponent(doc.source)}&type=${doc.type}`}
                    className="text-sm text-accent hover:underline inline-flex items-center font-medium"
                  >
                    View details <ArrowRight className="ml-1 h-3.5 w-3.5" />
                  </a>
                  <button
                    onClick={() => {
                      setUploadedDocument(doc);
                      setShowQuickChat(true);
                    }}
                    className="text-xs px-2 py-1 bg-accent/10 hover:bg-accent/20 text-accent rounded-md transition-colors flex items-center gap-1"
                  >
                    💬 Chat
                  </button>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="text-center py-12 mt-6">
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
                className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-accent text-accent-foreground text-sm font-medium hover:bg-accent/90 transition-colors"
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
        
        {/* Quick Chat Panel */}
        {showQuickChat && uploadedDocument && (
          <div className="mt-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Chat about your document</h2>
              <button
                onClick={() => {
                  setShowQuickChat(false);
                  setUploadedDocument(null);
                }}
                className="text-foreground/60 hover:text-foreground transition-colors"
              >
                ×
              </button>
            </div>
            <div className="h-96 bg-card rounded-lg border border-border">
              <ChatPanel 
                document={{
                  id: uploadedDocument.$id,
                  title: uploadedDocument.title,
                  type: uploadedDocument.type,
                  source: uploadedDocument.source
                }}
              />
            </div>
          </div>
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
                  className="flex-1 bg-accent text-accent-foreground px-4 py-2 rounded-lg font-medium hover:bg-accent/90 transition-colors"
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
                  className="flex-1 bg-accent text-accent-foreground px-4 py-2 rounded-lg font-medium hover:bg-accent/90 transition-colors"
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

        {/* Toast Notification */}
        {toast && (
          <div className="fixed bottom-4 right-4 z-50">
            <div className={`flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg border ${
              toast.type === 'success' 
                ? 'bg-accent/10 border-accent/20 text-accent-foreground' 
                : 'bg-destructive/10 border-destructive/20 text-destructive'
            }`}>
              {toast.type === 'success' ? (
                <CheckCircle className="h-4 w-4 text-accent" />
              ) : (
                <XCircle className="h-4 w-4 text-destructive" />
              )}
              <span className="text-sm text-white font-medium">{toast.message}</span>
              <button
                onClick={() => setToast(null)}
                className="ml-2 text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
