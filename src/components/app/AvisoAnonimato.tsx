import { ShieldCheck } from "lucide-react";

/**
 * Aviso de anonimato exibido ao aluno antes e depois de avaliar.
 * Reforça a REGRA INEGOCIÁVEL de anonimato por arquitetura.
 */
export function AvisoAnonimato() {
  return (
    <aside className="flex items-start gap-4 rounded-lg border border-border bg-accent/50 p-5">
      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent">
        <ShieldCheck className="h-5 w-5 text-primary" />
      </span>
      <div>
        <p className="eyebrow mb-1">Sua identidade está protegida</p>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Suas respostas <strong className="text-foreground">não são vinculadas ao seu nome</strong>{" "}
          em nenhuma etapa. O sistema foi projetado para que nem a escola nem os professores possam
          saber quem avaliou o quê. Resultados são exibidos apenas quando há avaliações suficientes,
          para evitar que qualquer resposta seja identificada.
        </p>
      </div>
    </aside>
  );
}
