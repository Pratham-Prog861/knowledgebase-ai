import { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "outline" | "ghost";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
}

const variantClasses: Record<Variant, string> = {
  primary: "bg-accent text-accent-foreground hover:bg-accent/90",
  outline: "border border-accent/40 text-accent hover:bg-accent/10",
  ghost: "text-accent hover:bg-accent/10",
};

const sizeClasses: Record<Size, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-10 px-4 text-sm",
  lg: "h-11 px-6 text-base",
};

export function Button({ variant = "primary", size = "md", className, children, ...props }: ButtonProps) {
  return (
    <button
      className={`rounded-lg font-medium transition ${variantClasses[variant]} ${sizeClasses[size]} ${className ?? ""}`}
      {...props}
    >
      {children}
    </button>
  );
}


