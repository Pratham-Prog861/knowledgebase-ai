"use client";
import Link from "next/link";
import { Button } from "@/components/Button";
import { SignUpButton, SignedIn, SignedOut, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Home() {
  const router = useRouter();
  const { isSignedIn, isLoaded } = useUser();

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      router.push('/dashboard');
    }
  }, [isLoaded, isSignedIn, router]);

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent mx-auto mb-4"></div>
          <p className="text-foreground/60">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-16">
      <section className="text-center space-y-6 pt-6">
        <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight text-foreground">KnowledgeBase AI</h1>
        <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
          Organize your files and links in one place. Ask anything and get AI-powered answers with citations.
        </p>
        <div className="flex items-center justify-center gap-3">
          <SignedOut>
            <SignUpButton mode="modal">
              <Button size="lg">Get Started</Button>
            </SignUpButton>
          </SignedOut>
          <SignedIn>
            <Link href="/dashboard">
              <Button size="lg">Go to Dashboard</Button>
            </Link>
          </SignedIn>
        </div>
      </section>

      <section id="features" className="grid sm:grid-cols-3 gap-6">
        <div className="rounded-2xl border border-border p-6 hover:shadow-md transition bg-card group">
          <div className="w-12 h-12 rounded-lg bg-accent/20 flex items-center justify-center mb-4 group-hover:bg-accent/30 transition">
            <svg className="w-6 h-6 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          <h3 className="font-semibold mb-2 tracking-tight text-foreground">Upload Files</h3>
          <p className="text-sm text-muted-foreground">Add PDFs and documents to your knowledge base. AI analyzes them for intelligent retrieval.</p>
        </div>
        <div className="rounded-2xl border border-border p-6 hover:shadow-md transition bg-card group">
          <div className="w-12 h-12 rounded-lg bg-accent/20 flex items-center justify-center mb-4 group-hover:bg-accent/30 transition">
            <svg className="w-6 h-6 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
          </div>
          <h3 className="font-semibold mb-2 tracking-tight text-foreground">Add Links</h3>
          <p className="text-sm text-muted-foreground">Save important web pages and articles. Keep everything searchable and accessible.</p>
        </div>
        <div className="rounded-2xl border border-border p-6 hover:shadow-md transition bg-card group">
          <div className="w-12 h-12 rounded-lg bg-accent/20 flex items-center justify-center mb-4 group-hover:bg-accent/30 transition">
            <svg className="w-6 h-6 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <h3 className="font-semibold mb-2 tracking-tight text-foreground">AI-Powered Search</h3>
          <p className="text-sm text-muted-foreground">Ask natural questions and get intelligent answers grounded in your content with citations.</p>
        </div>
      </section>
    </div>
  );
}
