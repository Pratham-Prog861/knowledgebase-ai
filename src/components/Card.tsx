import { ReactNode } from "react";

interface CardProps {
  title?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function Card({ title, actions, children, className }: CardProps) {
  return (
    <div className={`rounded-2xl border border-white/10 bg-[color:rgba(255,255,255,0.02)] backdrop-blur supports-[backdrop-filter]:bg-[color:rgba(255,255,255,0.04)] shadow-sm ${className ?? ""}`}>
      {(title || actions) && (
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10">
          {title && <h3 className="text-sm font-semibold tracking-tight text-white">{title}</h3>}
          {actions}
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  );
}


