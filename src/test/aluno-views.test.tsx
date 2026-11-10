import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockNavigate = vi.fn();
const mockParams = vi.fn().mockReturnValue({ vinculoId: "10" });
const mockSearch = vi.fn().mockReturnValue({ cicloId: 1 });

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-router")>();
  return {
    ...actual,
    Link: ({ children, to, params, search, className }: any) => (
      <a href={`${to}?${JSON.stringify({ params, search })}`} className={className}>
        {children}
      </a>
    ),
    useNavigate: () => mockNavigate,
    createFileRoute: (path: string) => (opts: any) => ({
      ...opts,
      useParams: () => mockParams(),
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
    },
  };
});

import { api, ApiError } from "@/lib/api";
import { Route as AlunoRoute } from "@/routes/aluno";
import { Route as AvaliarRoute } from "@/routes/aluno.avaliar.$vinculoId";

const AlunoComponent = AlunoRoute.component as React.ComponentType;
const AvaliarComponent = AvaliarRoute.component as React.ComponentType;

describe("PARTE 6C - Telas do Aluno", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockParams.mockReturnValue({ vinculoId: "10" });
    mockSearch.mockReturnValue({ cicloId: 1 });
  });

  describe("src/routes/aluno.tsx (Lista de pendências)", () => {
    it("exibe estado vazio acolhedor quando não há pendências", async () => {
      vi.mocked(api.get).mockImplementation(async (path: string) => {
        if (path === "/api/auth/me/") {
          return { id: 1, username: "aluna.bia", first_name: "Bia", role: "ALUNO", escola: 1 };
        }
        if (path === "/api/aluno/pendencias/") {
          return [];
        }
        return null;
      });

      render(<AlunoComponent />);

      await waitFor(() => {
        expect(screen.getByText("Tudo em dia com suas avaliações!")).toBeInTheDocument();
        expect(screen.getByText(/Não há avaliações pendentes para você no momento/i)).toBeInTheDocument();
      });
    });

    it("renderiza lista de vínculos pendentes e aviso de anonimato", async () => {
      vi.mocked(api.get).mockImplementation(async (path: string) => {
        if (path === "/api/auth/me/") {
          return { id: 1, username: "aluna.bia", first_name: "Bia", role: "ALUNO", escola: 1 };
        }
        if (path === "/api/aluno/pendencias/") {
          return [
            {
              ciclo_id: 1,
              ciclo_nome: "Ciclo Diagnóstico 2026",
              abre_em: "2026-03-01T00:00:00Z",
              fecha_em: "2026-03-31T23:59:59Z",
              vinculos: [
                {
                  id: 10,
                  professor_nome: "Prof. Marcos Paulo",
                  disciplina_nome: "Matemática",
                  turma_nome: "3º Ano A",
                },
              ],
            },
          ];
        }
        return null;
      });

      render(<AlunoComponent />);

      await waitFor(() => {
        expect(screen.getByText("Prof. Marcos Paulo")).toBeInTheDocument();
        expect(screen.getByText("Matemática")).toBeInTheDocument();
        expect(screen.getByText("Turma: 3º Ano A")).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /avaliar/i })).toBeInTheDocument();
        expect(screen.getByText(/Sua identidade está protegida/i)).toBeInTheDocument();
      });
    });
  });

  describe("src/routes/aluno.avaliar.$vinculoId.tsx (Questionário e Envio)", () => {
    const mockQuestionario = {
      ciclo: { id: 1, nome: "Ciclo Diagnóstico 2026", status: "ABERTO" },
      vinculo: {
        id: 10,
        professor_nome: "Prof. Marcos Paulo",
        disciplina_nome: "Matemática",
        turma_nome: "3º Ano A",
      },
      perguntas: [
        {
          id: 101,
          ciclo: 1,
          texto: "O professor explica com clareza os conteúdos?",
          tipo: "ESCALA_1_5",
          dimensao: "Didática",
          ordem: 1,
        },
        {
          id: 102,
          ciclo: 1,
          texto: "Deixe um comentário sobre como as aulas poderiam melhorar:",
          tipo: "TEXTO",
          dimensao: "Geral",
          ordem: 2,
        },
      ],
    };

    it("renderiza perguntas de escala e texto, e aviso de anonimato", async () => {
      vi.mocked(api.get).mockImplementation(async (path: string) => {
        if (path === "/api/auth/me/") {
          return { id: 1, username: "aluna.bia", first_name: "Bia", role: "ALUNO", escola: 1 };
        }
        if (path.includes("/questionario/")) {
          return mockQuestionario;
        }
        return null;
      });

      render(<AvaliarComponent />);

      await waitFor(() => {
        expect(screen.getByText(/O professor explica com clareza/i)).toBeInTheDocument();
        expect(screen.getByText(/Deixe um comentário sobre como as aulas/i)).toBeInTheDocument();
        expect(screen.getByText(/Sua identidade está protegida/i)).toBeInTheDocument();
      });
    });

    it("abre confirmação antes de enviar e submete a avaliação com sucesso", async () => {
      vi.mocked(api.get).mockImplementation(async (path: string) => {
        if (path === "/api/auth/me/") {
          return { id: 1, username: "aluna.bia", first_name: "Bia", role: "ALUNO", escola: 1 };
        }
        if (path.includes("/questionario/")) {
          return mockQuestionario;
        }
        return null;
      });
      vi.mocked(api.post).mockResolvedValueOnce({ id: "uuid-avaliacao-123" });

      render(<AvaliarComponent />);

      await waitFor(() => {
        expect(screen.getByText(/O professor explica com clareza/i)).toBeInTheDocument();
      });

      // Seleciona a nota 5 na escala
      const botaoNota5 = screen.getByRole("button", { name: /5/i });
      fireEvent.click(botaoNota5);

      // Preenche o comentário de texto
      const campoTexto = screen.getByPlaceholderText(/Compartilhe seu comentário construtivo/i);
      fireEvent.change(campoTexto, { target: { value: "Aulas muito boas e dinâmicas." } });

      // Clica em Revisar e Enviar
      const botaoRevisar = screen.getByRole("button", { name: /revisar e enviar/i });
      fireEvent.click(botaoRevisar);

      // Verifica abertura do modal de confirmação
      expect(screen.getByText("Deseja enviar sua avaliação?")).toBeInTheDocument();

      // Confirma o envio
      const botaoConfirmar = screen.getByRole("button", { name: /sim, confirmar e enviar/i });
      fireEvent.click(botaoConfirmar);

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith("/api/aluno/avaliacoes/", {
          ciclo_id: 1,
          vinculo_id: 10,
          respostas_escala: [{ pergunta_id: 101, valor: 5 }],
          respostas_texto: [{ pergunta_id: 102, texto: "Aulas muito boas e dinâmicas." }],
        });
        // Tela de agradecimento
        expect(screen.getByText("Obrigado pela sua contribuição!")).toBeInTheDocument();
      });
    });

    it("trata erro 409 (já avaliou) com mensagem acolhedora", async () => {
      vi.mocked(api.get).mockImplementation(async (path: string) => {
        if (path === "/api/auth/me/") {
          return { id: 1, username: "aluna.bia", first_name: "Bia", role: "ALUNO", escola: 1 };
        }
        if (path.includes("/questionario/")) {
          throw new ApiError(409, "Você já respondeu à avaliação deste professor neste ciclo.");
        }
        return null;
      });

      render(<AvaliarComponent />);

      await waitFor(() => {
        expect(screen.getByText("Você já avaliou este professor")).toBeInTheDocument();
        expect(screen.getByText(/Identificamos que você já participou da avaliação/i)).toBeInTheDocument();
      });
    });
  });
});
