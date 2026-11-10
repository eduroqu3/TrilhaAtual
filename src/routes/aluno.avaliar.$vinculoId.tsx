import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, Clock, Send, Star, AlertCircle } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { Card } from "@/components/app/Card";
import { Button } from "@/components/app/Button";
import { AvisoAnonimato } from "@/components/app/AvisoAnonimato";
import { requireAuth } from "@/lib/auth";
import { api, ApiError } from "@/lib/api";
import type { Pergunta, Usuario } from "@/types/api";

interface QuestionarioSearchParams {
  cicloId?: number;
}

interface QuestionarioData {
  ciclo: {
    id: number;
    nome: string;
    status: string;
  };
  vinculo: {
    id: number;
    professor_nome: string;
    disciplina_nome: string;
    turma_nome: string;
  };
  perguntas: Pergunta[];
}

export const Route = createFileRoute("/aluno/avaliar/$vinculoId")({
  validateSearch: (search: Record<string, unknown>): QuestionarioSearchParams => {
    return {
      cicloId: typeof search.cicloId === "number" ? search.cicloId : Number(search.cicloId) || undefined,
    };
  },
  beforeLoad: ({ location }) => requireAuth({ allowedRoles: ["ALUNO"], location }),
  component: AvaliarPage,
});

function AvaliarPage() {
  const { vinculoId } = Route.useParams();
  const { cicloId } = Route.useSearch();
  const navigate = useNavigate();

  const [user, setUser] = useState<Usuario | null>(null);
  const [data, setData] = useState<QuestionarioData | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Respostas
  const [respostasEscala, setRespostasEscala] = useState<Record<number, number>>({});
  const [respostasTexto, setRespostasTexto] = useState<Record<number, string>>({});

  // Estados de confirmação e envio
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [enviadoComSucesso, setEnviadoComSucesso] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      if (!cicloId) {
        setErrorMessage("Ciclo de avaliação não informado.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setErrorStatus(null);
        setErrorMessage(null);

        const [userData, questionarioData] = await Promise.all([
          api.get<Usuario>("/api/auth/me/"),
          api.get<QuestionarioData>(`/api/aluno/ciclos/${cicloId}/vinculos/${vinculoId}/questionario/`),
        ]);

        if (isMounted) {
          setUser(userData);
          setData(questionarioData);
        }
      } catch (err) {
        if (isMounted) {
          if (err instanceof ApiError) {
            setErrorStatus(err.status);
            setErrorMessage(err.detail);
          } else {
            setErrorMessage("Erro ao carregar o questionário de avaliação.");
          }
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      isMounted = false;
    };
  }, [cicloId, vinculoId]);

  const handleSubmit = async () => {
    if (!data || submitting) return;

    setSubmitting(true);
    setErrorMessage(null);

    const payload = {
      ciclo_id: data.ciclo.id,
      vinculo_id: data.vinculo.id,
      respostas_escala: Object.entries(respostasEscala).map(([pergunta_id, valor]) => ({
        pergunta_id: Number(pergunta_id),
        valor,
      })),
      respostas_texto: Object.entries(respostasTexto)
        .filter(([_, texto]) => Boolean(texto && texto.trim()))
        .map(([pergunta_id, texto]) => ({
          pergunta_id: Number(pergunta_id),
          texto: texto.trim(),
        })),
    };

    try {
      await api.post("/api/aluno/avaliacoes/", payload);
      setEnviadoComSucesso(true);
      setConfirming(false);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setErrorStatus(409);
        setErrorMessage("Você já respondeu à avaliação deste professor neste ciclo.");
        setConfirming(false);
      } else {
        setErrorMessage("Ocorreu um erro ao enviar sua avaliação. Verifique suas respostas e tente novamente.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const displayName = user?.first_name || user?.username || "Estudante";

  // Perguntas obrigatórias de escala que ainda não foram respondidas
  const perguntasEscala = data?.perguntas.filter((p) => p.tipo === "ESCALA_1_5") || [];
  const todasEscalasRespondidas = perguntasEscala.every((p) => Boolean(respostasEscala[p.id]));

  if (loading) {
    return (
      <AppShell userName={displayName}>
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <Clock className="h-8 w-8 animate-spin text-primary" />
          <p className="mt-4 text-sm font-medium">Carregando questionário de avaliação...</p>
        </div>
      </AppShell>
    );
  }

  // Tela de Sucesso / Agradecimento
  if (enviadoComSucesso) {
    return (
      <AppShell userName={displayName}>
        <div className="mx-auto max-w-2xl py-8">
          <Card shadow="mustard" className="text-center p-8 md:p-12 space-y-6">
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-accent text-primary">
              <CheckCircle2 className="h-10 w-10" />
            </span>

            <div>
              <p className="eyebrow">Escuta concluída</p>
              <h1 className="mt-3 font-serif text-3xl md:text-4xl font-medium text-foreground">
                Obrigado pela sua contribuição!
              </h1>
              <p className="mt-4 text-muted-foreground leading-relaxed">
                Sua avaliação sobre as aulas de{" "}
                <strong className="text-foreground">{data?.vinculo.professor_nome}</strong> (
                {data?.vinculo.disciplina_nome}) foi registrada com absoluto anonimato. Suas
                percepções ajudam a construir uma prática pedagógica cada vez mais acolhedora e eficaz.
              </p>
            </div>

            <div className="pt-4">
              <Button
                variant="primary"
                onClick={() => navigate({ to: "/aluno" })}
                iconRight={<ArrowRight className="h-4 w-4" />}
              >
                Voltar para minhas pendências
              </Button>
            </div>
          </Card>
        </div>
      </AppShell>
    );
  }

  // Tratamento de erro 409 (Já avaliou) ou outros erros
  if (errorStatus === 409) {
    return (
      <AppShell userName={displayName}>
        <div className="mx-auto max-w-xl py-12">
          <Card shadow="sage" className="p-8 text-center space-y-6">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent text-primary">
              <AlertCircle className="h-6 w-6" />
            </span>
            <div>
              <p className="eyebrow">Avaliação já realizada</p>
              <h2 className="mt-3 font-serif text-2xl font-medium text-foreground">
                Você já avaliou este professor
              </h2>
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                Identificamos que você já participou da avaliação deste vínculo neste ciclo. Para
                garantir a integridade da escuta e a proteção do seu anonimato, cada estudante
                responde uma única vez por disciplina.
              </p>
            </div>
            <Link to="/aluno">
              <Button variant="primary">Voltar para o painel</Button>
            </Link>
          </Card>
        </div>
      </AppShell>
    );
  }

  if (errorMessage && !data) {
    return (
      <AppShell userName={displayName}>
        <div className="mx-auto max-w-xl py-12">
          <Card className="p-8 text-center space-y-6 border-destructive/20 bg-destructive/5">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <AlertCircle className="h-6 w-6" />
            </span>
            <div>
              <h2 className="font-serif text-2xl font-medium text-foreground">Não foi possível carregar</h2>
              <p className="mt-2 text-sm text-muted-foreground">{errorMessage}</p>
            </div>
            <Link to="/aluno">
              <Button variant="outline">Voltar ao painel do estudante</Button>
            </Link>
          </Card>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell userName={displayName}>
      <div className="mx-auto max-w-3xl space-y-8">
        <div>
          <Link
            to="/aluno"
            className="inline-flex items-center gap-2 text-sm font-bold text-primary underline-offset-4 hover:underline mb-4"
          >
            <ArrowLeft className="h-4 w-4" /> Voltar para pendências
          </Link>
          <p className="eyebrow flex items-center gap-3">
            <span className="h-px w-8 bg-mustard" />
            {data?.ciclo.nome}
          </p>
          <h1 className="mt-3 text-3xl font-medium md:text-4xl">
            Avaliação: {data?.vinculo.professor_nome}
          </h1>
          <p className="mt-1 text-muted-foreground">
            Disciplina: <span className="text-foreground font-medium">{data?.vinculo.disciplina_nome}</span> · Turma:{" "}
            <span className="text-foreground font-medium">{data?.vinculo.turma_nome}</span>
          </p>
        </div>

        {/* Componente AvisoAnonimato bem visível */}
        <AvisoAnonimato />

        {errorMessage && (
          <div className="rounded-md border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive" role="alert">
            {errorMessage}
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            setConfirming(true);
          }}
          className="space-y-8"
        >
          {data?.perguntas.map((pergunta, index) => (
            <Card key={pergunta.id} className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span className="eyebrow text-xs text-muted-foreground">
                    Dimensão: {pergunta.dimensao}
                  </span>
                  <h2 className="mt-1 font-serif text-xl font-medium text-foreground">
                    {index + 1}. {pergunta.texto}
                  </h2>
                </div>
              </div>

              {pergunta.tipo === "ESCALA_1_5" ? (
                <div className="pt-2">
                  <div className="grid grid-cols-5 gap-2 sm:gap-4 max-w-md">
                    {[1, 2, 3, 4, 5].map((val) => {
                      const isSelected = respostasEscala[pergunta.id] === val;
                      return (
                        <button
                          key={val}
                          type="button"
                          onClick={() =>
                            setRespostasEscala((prev) => ({
                              ...prev,
                              [pergunta.id]: val,
                            }))
                          }
                          className={`flex flex-col items-center justify-center p-3 sm:p-4 rounded-md border text-sm font-bold transition-all ${
                            isSelected
                              ? "border-primary bg-primary text-primary-foreground shadow-sm scale-105"
                              : "border-border bg-background text-foreground hover:bg-accent"
                          }`}
                        >
                          <Star className={`h-5 w-5 mb-1 ${isSelected ? "fill-current" : ""}`} />
                          <span>{val}</span>
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground max-w-md mt-2 px-1">
                    <span>1 - Precisa melhorar muito</span>
                    <span>5 - Excelente</span>
                  </div>
                </div>
              ) : (
                <div className="pt-2">
                  <textarea
                    id={`pergunta-${pergunta.id}`}
                    name={`pergunta-${pergunta.id}`}
                    rows={4}
                    placeholder="Compartilhe seu comentário construtivo..."
                    value={respostasTexto[pergunta.id] || ""}
                    onChange={(e) =>
                      setRespostasTexto((prev) => ({
                        ...prev,
                        [pergunta.id]: e.target.value,
                      }))
                    }
                    className="w-full rounded-md border border-input bg-background p-4 text-sm outline-none focus:border-primary resize-y"
                  />
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    Lembrete: seus comentários passam por moderação pedagógica e são exibidos de forma anônima e sem data.
                  </p>
                </div>
              )}
            </Card>
          ))}

          <div className="flex justify-end pt-4">
            <Button
              type="submit"
              size="lg"
              disabled={!todasEscalasRespondidas || submitting}
              iconRight={<Send className="h-4 w-4" />}
            >
              Revisar e Enviar Avaliação
            </Button>
          </div>
        </form>

        {/* Modal de Confirmação antes de enviar */}
        {confirming && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-sm p-4">
            <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-mustard space-y-5 animate-in fade-in zoom-in-95">
              <div>
                <p className="eyebrow">Confirmar envio</p>
                <h3 className="mt-2 font-serif text-2xl font-medium text-foreground">
                  Deseja enviar sua avaliação?
                </h3>
                <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                  Uma vez enviada, a avaliação é desvinculada de você e guardada de forma definitiva. Você não poderá alterá-la depois.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <Button
                  variant="outline"
                  onClick={() => setConfirming(false)}
                  disabled={submitting}
                >
                  Continuar editando
                </Button>
                <Button
                  variant="primary"
                  onClick={handleSubmit}
                  disabled={submitting}
                >
                  {submitting ? "Enviando..." : "Sim, confirmar e enviar"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
