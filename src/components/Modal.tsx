"use client";
import { ReactNode } from "react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export function Modal({ open, onClose, title, children }: ModalProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="absolute inset-0 bg-black" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-xl border border-white/10 bg-[color:rgba(255,255,255,0.03)] shadow-lg">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <h3 className="text-sm font-semibold text-white">{title}</h3>
          <button onClick={onClose} className="text-sm text-[var(--accent)] hover:opacity-90">Close</button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}


