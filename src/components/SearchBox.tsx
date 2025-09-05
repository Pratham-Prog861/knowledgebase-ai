"use client";
import { useState, FormEvent } from "react";

interface SearchBoxProps {
  placeholder?: string;
  onSubmit: (query: string) => void;
}

export function SearchBox({ placeholder, onSubmit }: SearchBoxProps) {
  const [value, setValue] = useState("");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!value.trim()) return;
    onSubmit(value.trim());
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2 w-full">
      <input
        className="flex-1 h-10 rounded-lg border border-white/10 bg-[color:rgba(255,255,255,0.02)] px-3 text-sm outline-none focus:ring-2 focus:ring-[color:rgba(242,162,10,0.4)] placeholder:opacity-60"
        placeholder={placeholder ?? "Ask a question..."}
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      <button type="submit" className="h-10 px-4 rounded-lg bg-[var(--accent)] text-black text-sm font-medium hover:brightness-95">
        Search
      </button>
    </form>
  );
}


