import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockNavigate = vi.fn();
const mockSearch = vi.fn().mockReturnValue({});

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-router")>();
  return {
    ...actual,
    Link: ({ children, to, className }: any) => (
      <a href={to} className={className}>
        {children}
      </a>
    ),
    useNavigate: () => mockNavigate,
    createFileRoute: (path: string) => (opts: any) => ({
      ...opts,
      useSearch: () => mockSearch(),
      path,
    }),
  };
});

vi.mock("@/components/Logo", () => ({
  Logo: ({ className }: { className?: string }) => <img alt="Trilha" className={className} />,
}));

vi.mock("@/lib/api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api")>("@/lib/api");
  return {
    ...actual,
    api: {
      get: vi.fn(),
      post: vi.fn(),
      patch: vi.fn(),
    },
  };
});

import { api, ApiError } from "@/lib/api";
import { Route as ProfessorRoute } from "@/routes/professor";
import { Route as CoordenacaoRoute } from "@/routes/coordenacao";

const ProfessorComponent = ProfessorRoute.component as React.ComponentType;
const CoordenacaoComponent = CoordenacaoRoute.component as React.ComponentType;

describe("PARTE 6D - Telas do Professor e da Coordenação", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearch.mockReturnValue({});
  });

  // ─── Telas do Professor ────────────────────────────────────────────────────
  describe("src/routes/professor.tsx", () => {
    it("exibe mensagem acolhedora de 'dados insuficientes' quando abaixo do limiar (sem números)", async () => {
      vi.mocked(api.get).mockImplementation(async (path: string) => {
        if (path === "/api/auth/me/") {
          return { id: 2, username: "prof.andre", first_name: "André", role: "PROFESSOR", escola: 1 };
        }
        if (path.startsWith("/api/professor/resultados/")) {
          return {
            ciclo_id: 1,
            ciclo_nome: "Ciclo 1",
            resultados: [], // Vazio devido a limiar não atingido
          };
        }
        return null;
      });

      render(<ProfessorComponent />);

      await waitFor(() => {
        expect(screen.getByText("Dados insuficientes para este ciclo")).toBeInTheDocument();
        expect(screen.getByText(/Para proteger o anonimato dos estudantes/i)).toBeInTheDocument();
        // Não deve haver tabela/menção de ranking de colegas
        expect(screen.queryByText(/ranking de professores/i)).not.toBeInTheDocument();
      });
    });

    it("renderiza médias por dimensão e comentários aprovados sem autoria nem data", async () => {
      vi.mocked(api.get).mockImplementation(async (path: string) => {
        if (path === "/api/auth/me/") {
          return { id: 2, username: "prof.andre", first_name: "André", role: "PROFESSOR", escola: 1 };
        }
        if (path.startsWith("/api/professor/resultados/")) {
          return {
            ciclo_id: 1,
            ciclo_nome: "Ciclo Diagnóstico 2026",
            resultados: [
              {
                id: 10,
                disciplina_nome: "História Geral",
                turma_nome: "2º Ano B",
                n_avaliacoes: 12,
                medias_por_dimensao: {
                  Clareza: 4.5,
                  Didática: 4.8,
                },
                media_geral: 4.65,
                limiar_atingido: true,
                comentarios: [
                  { texto: "O professor traz exemplos do cotidiano que facilitam muito.", dimensao: "Didática" },
                ],
              },
            ],
          };
        }
        return null;
      });

      render(<ProfessorComponent />);

      await waitFor(() => {
        expect(screen.getByText("História Geral")).toBeInTheDocument();
        expect(screen.getByText("Turma: 2º Ano B")).toBeInTheDocument();
        expect(screen.getByText("Clareza")).toBeInTheDocument();
        expect(screen.getByText("4,5")).toBeInTheDocument();
        expect(screen.getAllByText("Didática").length).toBeGreaterThanOrEqual(1);
        expect(screen.getByText("4,8")).toBeInTheDocument();
        expect(
          screen.getByText(/O professor traz exemplos do cotidiano que facilitam muito/i),
        ).toBeInTheDocument();
      });
    });
  });

  // ─── Telas da Coordenação ──────────────────────────────────────────────────
  describe("src/routes/coordenacao.tsx", () => {
    it("exibe lista de ciclos e permite disparar ações de abrir, fechar e publicar", async () => {
      vi.mocked(api.get).mockImplementation(async (path: string) => {
        if (path === "/api/auth/me/") {
          return { id: 3, username: "coord.claudia", first_name: "Cláudia", role: "COORDENACAO", escola: 1 };
        }
        if (path === "/api/coordenacao/ciclos/") {
          return [
            {
              id: 1,
              nome: "Ciclo 1",
              status: "RASCUNHO",
              abre_em: "2026-03-01T00:00:00Z",
              fecha_em: "2026-03-31T23:59:59Z",
            },
          ];
        }
        return [];
      });
      vi.mocked(api.post).mockResolvedValue({ detail: "Ciclo aberto com sucesso." });

      render(<CoordenacaoComponent />);

      await waitFor(() => {
        expect(screen.getByText("Ciclo 1")).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /abrir para respostas/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: /abrir para respostas/i }));

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith("/api/coordenacao/ciclos/1/abrir/");
      });
    });

    it("exibe taxa de adesão agregada por turma (sem nomes de alunos)", async () => {
      vi.mocked(api.get).mockImplementation(async (path: string) => {
        if (path === "/api/auth/me/") {
          return { id: 3, username: "coord.claudia", first_name: "Cláudia", role: "COORDENACAO", escola: 1 };
        }
        if (path === "/api/coordenacao/ciclos/") {
          return [{ id: 1, nome: "Ciclo 1", status: "ABERTO", abre_em: "...", fecha_em: "..." }];
        }
        if (path === "/api/coordenacao/participacao/") {
          return {
            ciclo_id: 1,
            ciclo_nome: "Ciclo 1",
            status: "ABERTO",
            turmas: [
              {
                turma_id: 101,
                turma_nome: "1º Ano A",
                total_alunos: 30,
                alunos_responderam: 24,
                taxa_adesao_percentual: 80.0,
              },
            ],
          };
        }
        return [];
      });

      render(<CoordenacaoComponent />);

      // Muda para aba Adesão
      fireEvent.click(screen.getByRole("button", { name: /adesão agregada por turma/i }));

      await waitFor(() => {
        expect(screen.getByText("1º Ano A")).toBeInTheDocument();
        expect(screen.getByText("80%")).toBeInTheDocument();
        expect(screen.getByText(/24 de 30/i)).toBeInTheDocument();
        // Nomes individuais de alunos nunca aparecem
        expect(screen.queryByText("João")).not.toBeInTheDocument();
      });
    });

    it("permite aprovar e rejeitar comentários na fila de moderação", async () => {
      vi.mocked(api.get).mockImplementation(async (path: string) => {
        if (path === "/api/auth/me/") {
          return { id: 3, username: "coord.claudia", first_name: "Cláudia", role: "COORDENACAO", escola: 1 };
        }
        if (path === "/api/coordenacao/ciclos/") {
          return [];
        }
        if (path.includes("/api/coordenacao/comentarios/")) {
          return [
            {
              id: 55,
              texto: "Professor com metodologia muito dinâmica e atencioso.",
              status_moderacao: "PENDENTE",
              disciplina_nome: "Didática",
            },
          ];
        }
        return [];
      });
      vi.mocked(api.patch).mockResolvedValue({ detail: "Comentário aprovado." });

      render(<CoordenacaoComponent />);

      // Muda para aba Moderação
      fireEvent.click(screen.getByRole("button", { name: /moderação pedagógica/i }));

      await waitFor(() => {
        expect(
          screen.getByText(/Professor com metodologia muito dinâmica e atencioso/i),
        ).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /aprovar/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: /aprovar/i }));

      await waitFor(() => {
        expect(api.patch).toHaveBeenCalledWith("/api/coordenacao/comentarios/55/", {
          status_moderacao: "APROVADO",
        });
      });
    });
  });
});
