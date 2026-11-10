import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  /** Ícone ilustrativo (use lucide-react). */
  icon?: ReactNode;
  title: string;
  description?: string;
  /** Ação opcional, ex.: um botão. */
  action?: ReactNode;
  className?: string;
}

/**
 * Estado vazio padronizado.
 * Usa eyebrow, tipografia Fraunces e cores do design system.
 */
export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4 rounded-lg border border-border bg-secondary px-8 py-16 text-center",
        className,
      )}
    >
      {icon && (
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-accent text-primary">
          {icon}
        </span>
      )}
      <div>
        <p className="eyebrow mb-2">Nada aqui ainda</p>
        <h3 className="font-serif text-2xl font-medium text-foreground">{title}</h3>
        {description && (
          <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">{description}</p>
        )}
      </div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
