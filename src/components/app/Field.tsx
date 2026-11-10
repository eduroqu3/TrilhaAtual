import { cn } from "@/lib/utils";
import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";

/** Classes de input extraídas de entrar.tsx para manter consistência visual. */
const inputCls =
  "w-full rounded-md border border-input bg-background px-4 py-3 text-sm outline-none focus:border-primary disabled:opacity-50";

interface BaseFieldProps {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  className?: string;
}

type InputFieldProps = BaseFieldProps &
  InputHTMLAttributes<HTMLInputElement> & {
    as?: "input";
  };

type TextareaFieldProps = BaseFieldProps &
  TextareaHTMLAttributes<HTMLTextAreaElement> & {
    as: "textarea";
  };

type FieldProps = InputFieldProps | TextareaFieldProps;

/**
 * Campo de formulário do sistema interno.
 * Reutiliza o mesmo estilo de Field presente em entrar.tsx:
 * label acima, borda border-input, focus:border-primary.
 */
export function Field({ id, label, hint, error, className, ...props }: FieldProps) {
  const isTextarea = (props as TextareaFieldProps).as === "textarea";

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
      </label>

      {isTextarea ? (
        <textarea
          id={id}
          name={id}
          rows={4}
          className={cn(inputCls, "resize-y", error && "border-destructive focus:border-destructive")}
          {...(props as TextareaHTMLAttributes<HTMLTextAreaElement>)}
        />
      ) : (
        <input
          id={id}
          name={id}
          className={cn(inputCls, error && "border-destructive focus:border-destructive")}
          {...(props as InputHTMLAttributes<HTMLInputElement>)}
        />
      )}

      {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
