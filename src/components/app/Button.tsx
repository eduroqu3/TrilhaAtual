import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type Variant = "primary" | "outline" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
  /** Ícone à esquerda (use lucide-react). */
  iconLeft?: ReactNode;
  /** Ícone à direita (use lucide-react). */
  iconRight?: ReactNode;
  fullWidth?: boolean;
}

const variants: Record<Variant, string> = {
  primary:
    "bg-primary text-primary-foreground hover:bg-foreground focus-visible:outline-mustard",
  outline:
    "border border-border bg-background text-foreground hover:bg-accent focus-visible:outline-primary",
  ghost: "text-primary hover:bg-accent focus-visible:outline-primary",
  danger:
    "bg-destructive text-destructive-foreground hover:opacity-90 focus-visible:outline-destructive",
};

const sizes: Record<Size, string> = {
  sm: "px-3 py-2 text-xs",
  md: "px-5 py-3 text-sm",
  lg: "px-6 py-4 text-base",
};

/**
 * Botão do sistema interno.
 * Extrai o padrão de botão primário já usado em entrar.tsx e index.tsx:
 * rounded-md, font-bold, transition-colors, focus-visible outline-mustard.
 */
export function Button({
  variant = "primary",
  size = "md",
  children,
  iconLeft,
  iconRight,
  fullWidth = false,
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      type="button"
      {...props}
      className={cn(
        "group inline-flex items-center justify-center gap-2 rounded-md font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-50",
        variants[variant],
        sizes[size],
        fullWidth && "w-full",
        className,
      )}
    >
      {iconLeft}
      {children}
      {iconRight}
    </button>
  );
}
