import { SignedIn, SignedOut, SignUpButton, UserButton } from "@clerk/nextjs";
import Link from "next/link"
import React from "react";
import { Button } from "./Button";

const Navbar = () => {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
        <Link href="/" className="font-semibold tracking-tight text-foreground">
          KnowledgeBase AI
        </Link>
        <nav className="hidden sm:flex items-center gap-6 text-sm">
          <SignedIn>
            <Link
              href="/dashboard"
              className="text-muted-foreground hover:text-accent transition"
            >
              Dashboard
            </Link>
            <Link
              href="/search"
              className="text-muted-foreground hover:text-accent transition"
            >
              Search
            </Link>
            <Link
              href="/settings"
              className="text-muted-foreground hover:text-accent transition"
            >
              Settings
            </Link>
          </SignedIn>
          <SignedOut>
            <SignUpButton mode="modal">
              <Button size="sm">Get Started</Button>
            </SignUpButton>
          </SignedOut>
          <SignedIn>
            <UserButton />
          </SignedIn>
        </nav>
        <div className="flex sm:hidden items-center gap-2">
          <SignedIn>
            <UserButton />
          </SignedIn>
          <SignedOut>
            <SignUpButton mode="modal">
              <Button size="sm">Get Started</Button>
            </SignUpButton>
          </SignedOut>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
