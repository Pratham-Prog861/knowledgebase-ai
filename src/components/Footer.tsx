import React from "react";

const Footer = () => {
  return (
    <footer className="border-t border-border py-6 text-center text-sm text-muted-foreground">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        © {new Date().getFullYear()}{" "}
        <span className="text-accent font-medium">KnowledgeBase AI</span>
      </div>
    </footer>
  );
};

export default Footer;
