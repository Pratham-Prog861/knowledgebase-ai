import React from "react";

const Footer = () => {
  return (
    <footer className="border-t border-white/10 py-6 text-center text-sm text-foreground/70">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        © {new Date().getFullYear()}{" "}
        <span className="text-[var(--accent)]">KnowledgeBase AI</span>
      </div>
    </footer>
  );
};

export default Footer;
