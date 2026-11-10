import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  BarChart2,
  Calendar,
  CheckCircle,
  Clock,
  Layers,
  MessageSquare,
  Plus,
  Shield,
  ThumbsDown,
  ThumbsUp,
  Users,
} from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { Card } from "@/components/app/Card";
import { Button } from "@/components/app/Button";
import { EmptyState } from "@/components/app/EmptyState";
import { requireAuth } from "@/lib/auth";
import { api, ApiError } from "@/lib/api";
import type { Pergunta, Usuario } from "@/types/api";

type Tab = "ciclos" | "perguntas" | "participacao" | "moderacao";

interface CicloData {
  id: number;
  nome: string;
  abre_em: string;
  fecha_em: string;
  status: "RASCUNHO" | "ABERTO" | "FECHADO" | "PUBLICADO";
  created_at?: string;
}

interface TurmaAdesao {
  turma_id: number;
  turma_nome: string;
  ano_letivo?: number;
  total_alunos: number;
  alunos_responderam: number;
  taxa_adesao_percentual: number;
}

interface ParticipacaoResponse {
  ciclo_id: number;
  ciclo_nome: string;
  status: string;
  turmas: TurmaAdesao[];
}

interface ComentarioItem {
  id: number;
  texto: string;
  status_moderacao: "PENDENTE" | "APROVADO" | "REJEITADO";
  ciclo_nome?: string;
  disciplina_nome?: string;
}

export const Route = createFileRoute("/coordenacao")({
  beforeLoad: ({ location }) => requireAuth({ allowedRoles: ["COORDENACAO", "ADMIN"], location }),
  component: CoordenacaoPage,
});

function CoordenacaoPage() {
  const [user, setUser] = useState<Usuario | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("ciclos");
  const [loading, setLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  // Estados dos Ciclos
  const [ciclos, setCiclos] = useState<CicloData[]>([]);
  const [novoCicloNome, setNovoCicloNome] = useState("");
  const [novoCicloAbre, setNovoCicloAbre] = useState("");
  const [novoCicloFecha, setNovoCicloFecha] = useState("");
  const [criandoCiclo, setCriandoCiclo] = useState(false);

  // Estados de Perguntas
  const [cicloSelecionadoPerguntas, setCicloSelecionadoPerguntas] = useState<number | null>(null);
  const [perguntas, setPerguntas] = useState<Pergunta[]>([]);
  const [novaPerguntaTexto, setNovaPerguntaTexto] = useState("");
  const [novaPerguntaTipo, setNovaPerguntaTipo] = useState<"ESCALA_1_5" | "TEXTO">("ESCALA_1_5");
  const [novaPerguntaDimensao, setNovaPerguntaDimensao] = useState("Didática");
  const [criandoPergunta, setCriandoPergunta] = useState(false);

  // Estados de Adesão / Participação
  const [participacaoData, setParticipacaoData] = useState<ParticipacaoResponse | null>(null);

  // Estados de Moderação de Comentários
  const [comentarios, setComentarios] = useState<ComentarioItem[]>([]);
  const [moderandoId, setModerandoId] = useState<number | null>(null);

  useEffect(() => {
    async function loadUser() {
      try {
        const u = await api.get<Usuario>("/api/auth/me/");
        setUser(u);
      } catch {}
    }
    loadUser();
    carregarCiclos();
  }, []);

  useEffect(() => {
    if (activeTab === "ciclos") carregarCiclos();
    if (activeTab === "perguntas") carregarPerguntas(cicloSelecionadoPerguntas);
    if (activeTab === "participacao") carregarParticipacao();
    if (activeTab === "moderacao") carregarComentarios();
  }, [activeTab]);

  // ─── Ações de Ciclos ────────────────────────────────────────────────────────
  async function carregarCiclos() {
    try {
      setLoading(true);
      const res = await api.get<any>("/api/coordenacao/ciclos/");
      const lista: CicloData[] = Array.isArray(res) ? res : res.results || [];
      setCiclos(lista);
      if (lista.length > 0 && !cicloSelecionadoPerguntas) {
        setCicloSelecionadoPerguntas(lista[0].id);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  }

  async function handleCriarCiclo(e: React.FormEvent) {
    e.preventDefault();
    if (!novoCicloNome || !novoCicloAbre || !novoCicloFecha) return;
    try {
      setCriandoCiclo(true);
      await api.post("/api/coordenacao/ciclos/", {
        nome: novoCicloNome,
        abre_em: new Date(novoCicloAbre).toISOString(),
        fecha_em: new Date(novoCicloFecha).toISOString(),
        status: "RASCUNHO",
      });
      setNovoCicloNome("");
      setNovoCicloAbre("");
      setNovoCicloFecha("");
      setActionMsg("Ciclo criado com sucesso em Rascunho.");
      await carregarCiclos();
    } catch {
      setActionMsg("Erro ao criar ciclo.");
    } finally {
      setCriandoCiclo(false);
    }
  }

  async function mudarStatusCiclo(id: number, acao: "abrir" | "fechar" | "publicar") {
    try {
      setActionMsg(null);
      await api.post(`/api/coordenacao/ciclos/${id}/${acao}/`);
      setActionMsg(`Ciclo atualizado com sucesso (${acao}).`);
      await carregarCiclos();
    } catch (err: any) {
      setActionMsg(err?.detail || "Erro ao atualizar status do ciclo.");
    }
  }

  // ─── Ações de Perguntas ─────────────────────────────────────────────────────
  async function carregarPerguntas(cicloId: number | null) {
    if (!cicloId) return;
    try {
      setLoading(true);
      const res = await api.get<any>(`/api/coordenacao/perguntas/?ciclo=${cicloId}`);
      const lista: Pergunta[] = Array.isArray(res) ? res : res.results || [];
      setPerguntas(lista);
    } catch {
    } finally {
      setLoading(false);
    }
  }

  async function handleCriarPergunta(e: React.FormEvent) {
    e.preventDefault();
    if (!cicloSelecionadoPerguntas || !novaPerguntaTexto.trim()) return;
    try {
      setCriandoPergunta(true);
      await api.post("/api/coordenacao/perguntas/", {
        ciclo: cicloSelecionadoPerguntas,
        texto: novaPerguntaTexto.trim(),
        tipo: novaPerguntaTipo,
        dimensao: novaPerguntaDimensao,
        ordem: perguntas.length + 1,
      });
      setNovaPerguntaTexto("");
      setActionMsg("Pergunta cadastrada com sucesso.");
      await carregarPerguntas(cicloSelecionadoPerguntas);
    } catch {
      setActionMsg("Erro ao adicionar pergunta.");
    } finally {
      setCriandoPergunta(false);
    }
  }

  // ─── Ações de Participação ──────────────────────────────────────────────────
  async function carregarParticipacao() {
    try {
      setLoading(true);
      const res = await api.get<ParticipacaoResponse>("/api/coordenacao/participacao/");
      setParticipacaoData(res);
    } catch {
    } finally {
      setLoading(false);
    }
  }

  // ─── Ações de Moderação ─────────────────────────────────────────────────────
  async function carregarComentarios() {
    try {
      setLoading(true);
      const res = await api.get<ComentarioItem[]>("/api/coordenacao/comentarios/?status=PENDENTE");
      setComentarios(Array.isArray(res) ? res : []);
    } catch {
    } finally {
      setLoading(false);
    }
  }

  async function moderarComentario(id: number, statusMod: "APROVADO" | "REJEITADO") {
    try {
      setModerandoId(id);
      await api.patch(`/api/coordenacao/comentarios/${id}/`, {
        status_moderacao: statusMod,
      });
      setComentarios((prev) => prev.filter((c) => c.id !== id));
      setActionMsg(`Comentário avaliado como ${statusMod.toLowerCase()}.`);
    } catch {
      setActionMsg("Erro ao moderar comentário.");
    } finally {
      setModerandoId(null);
    }
  }

  const displayName = user?.first_name || user?.username || "Coordenação";

  return (
    <AppShell userName={displayName}>
      <div className="space-y-8">
        <div>
          <p className="eyebrow flex items-center gap-3">
            <span className="h-px w-8 bg-mustard" />
            Gestão Escolar e Escuta Pedagógica
          </p>
          <h1 className="mt-3 text-3xl font-medium md:text-4xl">Painel da Coordenação</h1>
          <p className="mt-2 text-muted-foreground max-w-2xl">
            Acompanhe a adesão das turmas, estruture ciclos avaliativos e modere as manifestações com
            responsabilidade pedagógica. Todo o sistema opera sob a garantia de anonimato absoluto por arquitetura.
          </p>
        </div>

        {actionMsg && (
          <div className="rounded-md border border-primary/20 bg-accent p-3 text-sm font-medium text-foreground flex items-center justify-between">
            <span>{actionMsg}</span>
            <button
              type="button"
              onClick={() => setActionMsg(null)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Fechar
            </button>
          </div>
        )}

        {/* Abas de Navegação Interna */}
        <div className="flex flex-wrap gap-2 border-b border-border pb-2">
          <button
            type="button"
            onClick={() => setActiveTab("ciclos")}
            className={`inline-flex items-center gap-2 rounded-md px-4 py-2.5 text-sm font-bold transition-colors ${
              activeTab === "ciclos"
                ? "bg-primary text-primary-foreground"
                : "bg-background text-foreground hover:bg-secondary"
            }`}
          >
            <Calendar className="h-4 w-4" /> Ciclos Avaliativos
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("perguntas")}
            className={`inline-flex items-center gap-2 rounded-md px-4 py-2.5 text-sm font-bold transition-colors ${
              activeTab === "perguntas"
                ? "bg-primary text-primary-foreground"
                : "bg-background text-foreground hover:bg-secondary"
            }`}
          >
            <Layers className="h-4 w-4" /> Perguntas & Questionários
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("participacao")}
            className={`inline-flex items-center gap-2 rounded-md px-4 py-2.5 text-sm font-bold transition-colors ${
              activeTab === "participacao"
                ? "bg-primary text-primary-foreground"
                : "bg-background text-foreground hover:bg-secondary"
            }`}
          >
            <BarChart2 className="h-4 w-4" /> Adesão Agregada por Turma
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("moderacao")}
            className={`inline-flex items-center gap-2 rounded-md px-4 py-2.5 text-sm font-bold transition-colors ${
              activeTab === "moderacao"
                ? "bg-primary text-primary-foreground"
                : "bg-background text-foreground hover:bg-secondary"
            }`}
          >
            <MessageSquare className="h-4 w-4" /> Moderação Pedagógica
          </button>
        </div>

        {/* ─── ABA 1: CICLOS AVALIATIVOS ────────────────────────────────────────── */}
        {activeTab === "ciclos" && (
          <div className="space-y-8">
            <Card shadow="sage">
              <h2 className="font-serif text-xl font-medium text-foreground mb-4">
                Novo Ciclo de Escuta
              </h2>
              <form onSubmit={handleCriarCiclo} className="grid gap-4 sm:grid-cols-3 items-end">
                <div>
                  <label htmlFor="ciclo-nome" className="block text-xs font-bold text-foreground mb-1">
                    Nome do Ciclo
                  </label>
                  <input
                    id="ciclo-nome"
                    type="text"
                    required
                    placeholder="Ex: Ciclo Diagnóstico 2026"
                    value={novoCicloNome}
                    onChange={(e) => setNovoCicloNome(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label htmlFor="ciclo-abre" className="block text-xs font-bold text-foreground mb-1">
                    Data de Abertura
                  </label>
                  <input
                    id="ciclo-abre"
                    type="date"
                    required
                    value={novoCicloAbre}
                    onChange={(e) => setNovoCicloAbre(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label htmlFor="ciclo-fecha" className="block text-xs font-bold text-foreground mb-1">
                    Data de Fechamento
                  </label>
                  <input
                    id="ciclo-fecha"
                    type="date"
                    required
                    value={novoCicloFecha}
                    onChange={(e) => setNovoCicloFecha(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                  />
                </div>
                <div className="sm:col-span-3 flex justify-end">
                  <Button type="submit" disabled={criandoCiclo} iconLeft={<Plus className="h-4 w-4" />}>
                    {criandoCiclo ? "Criando..." : "Criar Ciclo"}
                  </Button>
                </div>
              </form>
            </Card>

            <div className="space-y-4">
              <h2 className="font-serif text-2xl font-medium text-foreground">Ciclos Cadastrados</h2>
              {ciclos.length === 0 ? (
                <EmptyState title="Nenhum ciclo criado" description="Comece criando um ciclo de escuta acima." />
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {ciclos.map((c) => (
                    <Card key={c.id} className="space-y-4 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between">
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                              c.status === "ABERTO"
                                ? "bg-accent text-primary"
                                : c.status === "PUBLICADO"
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-secondary text-muted-foreground"
                            }`}
                          >
                            {c.status}
                          </span>
                          <span className="text-xs text-muted-foreground">ID #{c.id}</span>
                        </div>
                        <h3 className="font-serif text-xl font-medium text-foreground mt-2">{c.nome}</h3>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(c.abre_em).toLocaleDateString("pt-BR")} até{" "}
                          {new Date(c.fecha_em).toLocaleDateString("pt-BR")}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2 pt-3 border-t border-border">
                        {c.status === "RASCUNHO" && (
                          <Button size="sm" variant="primary" onClick={() => mudarStatusCiclo(c.id, "abrir")}>
                            Abrir para Respostas
                          </Button>
                        )}
                        {c.status === "ABERTO" && (
                          <Button size="sm" variant="outline" onClick={() => mudarStatusCiclo(c.id, "fechar")}>
                            Fechar Ciclo
                          </Button>
                        )}
                        {(c.status === "FECHADO" || c.status === "ABERTO") && (
                          <Button size="sm" variant="primary" onClick={() => mudarStatusCiclo(c.id, "publicar")}>
                            Publicar Resultados
                          </Button>
                        )}
                        {c.status === "PUBLICADO" && (
                          <span className="text-xs text-primary font-medium flex items-center gap-1.5 py-1">
                            <CheckCircle className="h-4 w-4" /> Resultados visíveis aos professores
                          </span>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── ABA 2: GESTÃO DE PERGUNTAS ──────────────────────────────────────── */}
        {activeTab === "perguntas" && (
          <div className="space-y-8">
            <div className="flex items-center gap-4 bg-secondary p-4 rounded-lg border border-border">
              <label htmlFor="select-ciclo-pergunta" className="text-sm font-bold text-foreground">
                Selecione o Ciclo:
              </label>
              <select
                id="select-ciclo-pergunta"
                value={cicloSelecionadoPerguntas || ""}
                onChange={(e) => {
                  const id = Number(e.target.value);
                  setCicloSelecionadoPerguntas(id);
                  carregarPerguntas(id);
                }}
                className="rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              >
                {ciclos.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome} ({c.status})
                  </option>
                ))}
              </select>
            </div>

            <Card shadow="mustard">
              <h2 className="font-serif text-xl font-medium text-foreground mb-4">
                Adicionar Pergunta ao Questionário
              </h2>
              <form onSubmit={handleCriarPergunta} className="space-y-4">
                <div>
                  <label htmlFor="pergunta-texto" className="block text-xs font-bold text-foreground mb-1">
                    Enunciado da Pergunta
                  </label>
                  <input
                    id="pergunta-texto"
                    type="text"
                    required
                    placeholder="Ex: As explicações do professor ajudam na compreensão da matéria?"
                    value={novaPerguntaTexto}
                    onChange={(e) => setNovaPerguntaTexto(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="pergunta-tipo" className="block text-xs font-bold text-foreground mb-1">
                      Tipo de Resposta
                    </label>
                    <select
                      id="pergunta-tipo"
                      value={novaPerguntaTipo}
                      onChange={(e) => setNovaPerguntaTipo(e.target.value as any)}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                    >
                      <option value="ESCALA_1_5">Escala de 1 a 5 (Estrelas)</option>
                      <option value="TEXTO">Comentário Aberto (Texto)</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="pergunta-dimensao" className="block text-xs font-bold text-foreground mb-1">
                      Dimensão Pedagógica
                    </label>
                    <input
                      id="pergunta-dimensao"
                      type="text"
                      required
                      placeholder="Ex: Didática, Clareza, Relacionamento"
                      value={novaPerguntaDimensao}
                      onChange={(e) => setNovaPerguntaDimensao(e.target.value)}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button type="submit" disabled={criandoPergunta} iconLeft={<Plus className="h-4 w-4" />}>
                    {criandoPergunta ? "Adicionando..." : "Adicionar Pergunta"}
                  </Button>
                </div>
              </form>
            </Card>

            <div className="space-y-3">
              <h2 className="font-serif text-2xl font-medium text-foreground">
                Perguntas Cadastradas ({perguntas.length})
              </h2>
              {perguntas.length === 0 ? (
                <EmptyState
                  title="Nenhuma pergunta cadastrada"
                  description="Adicione perguntas ao ciclo selecionado para que os alunos possam avaliar."
                />
              ) : (
                <div className="grid gap-3">
                  {perguntas.map((p, idx) => (
                    <div
                      key={p.id}
                      className="flex items-start justify-between gap-4 rounded-md border border-border bg-card p-4"
                    >
                      <div>
                        <span className="eyebrow text-xs text-primary">
                          {p.dimensao} · {p.tipo === "ESCALA_1_5" ? "Escala 1 a 5" : "Texto Aberto"}
                        </span>
                        <p className="font-medium text-foreground mt-1">
                          {idx + 1}. {p.texto}
                        </p>
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0 bg-secondary px-2 py-1 rounded">
                        Ordem {p.ordem}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── ABA 3: ADESÃO AGREGADA POR TURMA ─────────────────────────────────── */}
        {activeTab === "participacao" && (
          <div className="space-y-6">
            <div className="rounded-lg border border-border bg-accent/40 p-4 flex items-center gap-4">
              <Shield className="h-5 w-5 text-primary shrink-0" />
              <p className="text-sm text-foreground">
                <strong>Proteção de Anonimato:</strong> os dados abaixo mostram exclusivamente a adesão agregada por turma.
                Nenhum nome de estudante ou identificador individual é retornado pelo sistema.
              </p>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <Clock className="h-8 w-8 animate-spin text-primary" />
                <p className="mt-4 text-sm font-medium">Calculando taxa de adesão das turmas...</p>
              </div>
            ) : !participacaoData || participacaoData.turmas.length === 0 ? (
              <EmptyState
                icon={<Users className="h-8 w-8 text-primary" />}
                title="Sem dados de adesão disponíveis"
                description="Não há turmas cadastradas ou nenhum ciclo avaliativo ativo encontrado."
              />
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <h2 className="font-serif text-2xl font-medium text-foreground">
                    Adesão: {participacaoData.ciclo_nome}
                  </h2>
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Status: {participacaoData.status}
                  </span>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {participacaoData.turmas.map((t) => (
                    <Card key={t.turma_id} className="space-y-4">
                      <div className="flex items-baseline justify-between border-b border-border/60 pb-2">
                        <h3 className="font-serif text-xl font-medium text-foreground">{t.turma_nome}</h3>
                        <span className="font-serif text-2xl font-bold text-primary">
                          {t.taxa_adesao_percentual}%
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-border overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${Math.min(100, t.taxa_adesao_percentual)}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground pt-1">
                        <span>Alunos que participaram:</span>
                        <strong className="text-foreground">{t.alunos_responderam} de {t.total_alunos}</strong>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── ABA 4: MODERAÇÃO DE COMENTÁRIOS ─────────────────────────────────── */}
        {activeTab === "moderacao" && (
          <div className="space-y-6">
            <div className="rounded-lg border border-border bg-secondary p-4 flex items-center justify-between">
              <div>
                <h2 className="font-serif text-lg font-medium text-foreground">
                  Fila de Moderação Pedagógica
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Comentários apresentados em ordem aleatória, desvinculados de qualquer aluno ou data.
                  Apenas comentários pedagógicos construtivos devem ser aprovados.
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={carregarComentarios}>
                Atualizar
              </Button>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <Clock className="h-8 w-8 animate-spin text-primary" />
                <p className="mt-4 text-sm font-medium">Carregando comentários para moderação...</p>
              </div>
            ) : comentarios.length === 0 ? (
              <EmptyState
                icon={<CheckCircle className="h-8 w-8 text-primary" />}
                title="Fila de moderação zerada!"
                description="Todos os comentários pendentes já foram avaliados. Novos textos aparecerão conforme estudantes participarem dos ciclos abertos."
              />
            ) : (
              <div className="grid gap-4">
                {comentarios.map((c) => (
                  <Card key={c.id} className="space-y-4 p-6">
                    <div className="flex items-center justify-between">
                      <span className="eyebrow text-xs text-primary">
                        {c.disciplina_nome ? `Dimensão: ${c.disciplina_nome}` : "Comentário de Avaliação"}
                      </span>
                      <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded">
                        ID #{c.id}
                      </span>
                    </div>

                    <p className="text-base text-foreground font-sans italic leading-relaxed bg-secondary/40 p-4 rounded-md">
                      “{c.texto}”
                    </p>

                    <div className="flex items-center justify-end gap-3 pt-2">
                      <Button
                        size="sm"
                        variant="danger"
                        disabled={moderandoId === c.id}
                        onClick={() => moderarComentario(c.id, "REJEITADO")}
                        iconLeft={<ThumbsDown className="h-4 w-4" />}
                      >
                        Rejeitar
                      </Button>
                      <Button
                        size="sm"
                        variant="primary"
                        disabled={moderandoId === c.id}
                        onClick={() => moderarComentario(c.id, "APROVADO")}
                        iconLeft={<ThumbsUp className="h-4 w-4" />}
                      >
                        Aprovar
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
