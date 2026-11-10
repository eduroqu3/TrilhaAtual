import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  /** Aplica sombra estilo sage (padrão) ou mustard. */
  shadow?: "sage" | "mustard" | "none";
}

/**
 * Card genérico do sistema interno.
 * Corresponde ao mesmo estilo de card usado na landing (bg-card, border-border).
 */
export function Card({ children, className, shadow = "none" }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-card p-6",
        shadow === "sage" && "shadow-sage",
        shadow === "mustard" && "shadow-mustard",
        className,
      )}
    >
      {children}
    </div>
  );
}
