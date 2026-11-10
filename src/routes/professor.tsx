import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Clock, MessageSquare, Quote, Sparkles, BookOpen, AlertCircle } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { Card } from "@/components/app/Card";
import { EmptyState } from "@/components/app/EmptyState";
import { requireAuth } from "@/lib/auth";
import { api, ApiError } from "@/lib/api";
import type { Usuario } from "@/types/api";

interface ProfessorSearchParams {
  ciclo?: number;
}

interface ComentarioAprovado {
  texto: string;
  dimensao?: string;
}

interface ResultadoVinculo {
  id: number;
  disciplina_nome: string;
  turma_nome: string;
  n_avaliacoes: number;
  medias_por_dimensao: Record<string, number>;
  media_geral: number;
  limiar_atingido: boolean;
  comentarios: ComentarioAprovado[];
}

interface ResultadosResponse {
  ciclo_id: number;
  ciclo_nome: string;
  resultados: ResultadoVinculo[];
}

export const Route = createFileRoute("/professor")({
  validateSearch: (search: Record<string, unknown>): ProfessorSearchParams => {
    return {
      ciclo: typeof search.ciclo === "number" ? search.ciclo : Number(search.ciclo) || undefined,
    };
  },
  beforeLoad: ({ location }) => requireAuth({ allowedRoles: ["PROFESSOR"], location }),
  component: ProfessorPage,
});

function ProfessorPage() {
  const { ciclo: cicloParam } = Route.useSearch();
  const [user, setUser] = useState<Usuario | null>(null);
  const [cicloIdInput, setCicloIdInput] = useState<string>(cicloParam ? String(cicloParam) : "1");
  const [data, setData] = useState<ResultadosResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function carregarResultados(idCiclo: string) {
    if (!idCiclo) return;
    try {
      setLoading(true);
      setErrorStatus(null);
      setErrorMessage(null);

      const [userData, resData] = await Promise.all([
        api.get<Usuario>("/api/auth/me/"),
        api.get<ResultadosResponse>(`/api/professor/resultados/?ciclo=${idCiclo}`),
      ]);

      setUser(userData);
      setData(resData);
    } catch (err) {
      if (err instanceof ApiError) {
        setErrorStatus(err.status);
        setErrorMessage(err.detail);
      } else {
        setErrorMessage("Erro ao consultar resultados do ciclo.");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregarResultados(cicloIdInput);
  }, []);

  const displayName = user?.first_name || user?.username || "Professor(a)";

  return (
    <AppShell userName={displayName}>
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <p className="eyebrow flex items-center gap-3">
              <span className="h-px w-8 bg-mustard" />
              Escuta Pedagógica Docente
            </p>
            <h1 className="mt-3 text-3xl font-medium md:text-4xl">Percepções e Caminhos da sua Prática</h1>
            <p className="mt-2 text-muted-foreground max-w-2xl">
              Este espaço reúne as percepções compartilhadas pelos estudantes sobre a experiência nas suas aulas.
              Lembre-se: avaliações são pontos de partida para reflexão e conversa formativa — nunca um veredito ou ranking.
            </p>
          </div>

          {/* Seletor de Ciclo */}
          <div className="flex items-center gap-2 bg-secondary p-2 rounded-lg border border-border shrink-0">
            <label htmlFor="ciclo-select" className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-2">
              Ciclo ID:
            </label>
            <input
              id="ciclo-select"
              type="number"
              min="1"
              value={cicloIdInput}
              onChange={(e) => setCicloIdInput(e.target.value)}
              className="w-16 rounded border border-input bg-background px-2 py-1 text-sm font-bold text-center outline-none focus:border-primary"
            />
            <button
              type="button"
              onClick={() => carregarResultados(cicloIdInput)}
              className="rounded bg-primary px-3 py-1 text-xs font-bold text-primary-foreground hover:bg-foreground transition-colors"
            >
              Consultar
            </button>
          </div>
        </div>

        {/* Citação pedagógica da Trilha */}
        <div className="rounded-lg border border-border bg-accent/40 p-4 flex items-center gap-4">
          <Sparkles className="h-5 w-5 text-mustard shrink-0" />
          <p className="text-sm italic text-foreground">
            “Uma nota é uma pergunta para aprofundar — não uma resposta definitiva sobre quem ensina.”
          </p>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Clock className="h-8 w-8 animate-spin text-primary" />
            <p className="mt-4 text-sm font-medium">Buscando resultados consolidados...</p>
          </div>
        ) : errorStatus === 403 ? (
          /* Ciclo ainda não publicado */
          <Card shadow="sage" className="text-center p-10 max-w-2xl mx-auto space-y-4">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent text-primary">
              <Clock className="h-6 w-6" />
            </span>
            <h2 className="font-serif text-2xl font-medium text-foreground">Ciclo em Andamento</h2>
            <p className="text-muted-foreground leading-relaxed">
              Os resultados deste ciclo ainda não foram publicados pela coordenação. Os dados só ficam
              disponíveis após o encerramento do período de escuta e a moderação pedagógica dos comentários.
            </p>
          </Card>
        ) : errorMessage ? (
          <Card className="text-center p-8 max-w-xl mx-auto border-destructive/20 bg-destructive/5 space-y-4">
            <AlertCircle className="mx-auto h-8 w-8 text-destructive" />
            <h2 className="font-serif text-xl font-medium text-foreground">Não foi possível carregar os resultados</h2>
            <p className="text-sm text-muted-foreground">{errorMessage}</p>
          </Card>
        ) : !data || data.resultados.length === 0 ? (
          /* DADOS INSUFICIENTES (abaixo do limiar mínimo) — SEM EXIBIR NÚMEROS */
          <EmptyState
            icon={<BookOpen className="h-8 w-8 text-primary" />}
            title="Dados insuficientes para este ciclo"
            description="Para proteger o anonimato dos estudantes e garantir uma escuta estatisticamente representativa, a Trilha só exibe resultados agregados quando o número mínimo de avaliações estabelecido pela escola é atingido. Nenhuma avaliação isolada é revelada."
          />
        ) : (
          /* RESULTADOS POR DISCIPLINA / TURMA */
          <div className="space-y-10">
            <div className="border-b border-border pb-3 flex items-center justify-between">
              <h2 className="font-serif text-2xl font-medium text-foreground">{data.ciclo_nome}</h2>
              <span className="text-xs font-bold uppercase tracking-wider text-primary bg-accent px-3 py-1 rounded-full">
                {data.resultados.length} {data.resultados.length === 1 ? "turma avaliada" : "turmas avaliadas"}
              </span>
            </div>

            <div className="grid gap-8">
              {data.resultados.map((res) => {
                const dimensoes = Object.entries(res.medias_por_dimensao || {});

                return (
                  <Card key={res.id} shadow="sage" className="space-y-6 p-8">
                    {/* Cabeçalho do Vínculo */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border/80 pb-4">
                      <div>
                        <span className="eyebrow text-xs text-primary">{res.disciplina_nome}</span>
                        <h3 className="font-serif text-2xl font-medium text-foreground mt-0.5">
                          Turma: {res.turma_nome}
                        </h3>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground bg-secondary px-3 py-1.5 rounded-md font-medium">
                          {res.n_avaliacoes} avaliações acolhidas
                        </span>
                      </div>
                    </div>

                    {/* Dimensões da Prática Pedagógica */}
                    <div>
                      <h4 className="font-serif text-lg font-medium text-foreground mb-4">
                        Percepções por Dimensão Pedagógica
                      </h4>
                      {dimensoes.length === 0 ? (
                        <p className="text-sm text-muted-foreground italic">
                          Nenhuma dimensão quantitativa registrada.
                        </p>
                      ) : (
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                          {dimensoes.map(([dimensao, media]) => (
                            <div key={dimensao} className="rounded-md border border-border bg-secondary p-4 space-y-2">
                              <div className="flex items-baseline justify-between">
                                <span className="text-sm font-medium text-foreground">{dimensao}</span>
                                <span className="font-serif text-2xl font-semibold text-primary">
                                  {Number(media).toFixed(1).replace(".", ",")}
                                  <span className="text-xs text-muted-foreground font-sans ml-1">/ 5,0</span>
                                </span>
                              </div>
                              <div className="h-2 w-full rounded-full bg-border overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-primary transition-all duration-500"
                                  style={{ width: `${(Number(media) / 5) * 100}%` }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Comentários Aprovados */}
                    <div className="pt-4 border-t border-border/80">
                      <div className="flex items-center gap-2 mb-4">
                        <MessageSquare className="h-5 w-5 text-primary" />
                        <h4 className="font-serif text-lg font-medium text-foreground">
                          Observações e Sugestões dos Estudantes
                        </h4>
                      </div>

                      {res.comentarios.length === 0 ? (
                        <p className="text-sm text-muted-foreground italic rounded-md bg-secondary/50 p-4">
                          Nenhum comentário em texto foi submetido ou aprovado para esta turma.
                        </p>
                      ) : (
                        <div className="grid gap-3 sm:grid-cols-2">
                          {res.comentarios.map((c, idx) => (
                            <div
                              key={idx}
                              className="relative rounded-lg border border-border bg-card p-5 shadow-sm space-y-2"
                            >
                              <Quote className="h-4 w-4 text-mustard" />
                              <p className="text-sm text-foreground/90 leading-relaxed font-sans italic">
                                “{c.texto}”
                              </p>
                              {c.dimensao && (
                                <p className="text-xs text-muted-foreground">
                                  Refere-se a: <span className="font-medium">{c.dimensao}</span>
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
