import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";

// ─── Mocks de módulos ─────────────────────────────────────────────────────────

const mockNavigate = vi.fn();
const mockSearch = vi.fn().mockReturnValue({});

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-router")>();
  return {
    ...actual,
    Link: ({ children, to, className }: { children: React.ReactNode; to: string; className?: string }) => (
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
    redirect: (args: any) => ({ isRedirect: true, ...args }),
  };
});

vi.mock("@/components/Logo", () => ({
  Logo: ({ className }: { className?: string }) => <img alt="Trilha" className={className} />,
}));

// Mock da API
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
import { Route } from "@/routes/entrar";
import { getSession, requireAuth, sanitizeRedirect, ROLE_PANELS } from "@/lib/auth";
import type { Usuario } from "@/types/api";

const EntrarComponent = Route.component as React.ComponentType;

describe("PARTE 6B - Autenticação e tela de login", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearch.mockReturnValue({});
  });

  // ─── 1. Validação de Open Redirect ──────────────────────────────────────────
  describe("sanitizeRedirect", () => {
    it("aceita caminhos internos seguros", () => {
      expect(sanitizeRedirect("/aluno")).toBe("/aluno");
      expect(sanitizeRedirect("/professor/resultados?ciclo=1")).toBe("/professor/resultados?ciclo=1");
      expect(sanitizeRedirect("/coordenacao/participacao")).toBe("/coordenacao/participacao");
    });

    it("rejeita URLs externas e esquemas perigosos", () => {
      expect(sanitizeRedirect("https://malicious.com")).toBeNull();
      expect(sanitizeRedirect("http://malicious.com")).toBeNull();
      expect(sanitizeRedirect("//malicious.com")).toBeNull();
      expect(sanitizeRedirect("javascript:alert(1)")).toBeNull();
      expect(sanitizeRedirect("/\\malicious.com")).toBeNull();
      expect(sanitizeRedirect("")).toBeNull();
      expect(sanitizeRedirect(null)).toBeNull();
      expect(sanitizeRedirect(undefined)).toBeNull();
    });
  });

  // ─── 2. Proteção de rotas com requireAuth (beforeLoad) ──────────────────────
  describe("requireAuth (proteção de rotas)", () => {
    it("acesso sem sessão é redirecionado para /entrar com redirect preservado", async () => {
      vi.mocked(api.get).mockRejectedValueOnce(new ApiError(401, "Não autenticado"));

      await expect(
        requireAuth({
          allowedRoles: ["ALUNO"],
          location: { pathname: "/aluno" },
        }),
      ).rejects.toEqual(
        expect.objectContaining({
          isRedirect: true,
          to: "/entrar",
          search: { redirect: "/aluno" },
        }),
      );
    });

    it("usuário autenticado com papel errado é redirecionado para o painel correto", async () => {
      const professorUser: Usuario = {
        id: 2,
        username: "prof.joao",
        email: "joao@escola.com",
        first_name: "João",
        last_name: "Silva",
        role: "PROFESSOR",
        escola: 1,
      };
      vi.mocked(api.get).mockResolvedValueOnce(professorUser);

      // Tenta acessar rota de ALUNO
      await expect(
        requireAuth({
          allowedRoles: ["ALUNO"],
          location: { pathname: "/aluno" },
        }),
      ).rejects.toEqual(
        expect.objectContaining({
          isRedirect: true,
          to: "/professor",
        }),
      );
    });

    it("usuário autenticado com papel permitido acessa com sucesso", async () => {
      const alunoUser: Usuario = {
        id: 1,
        username: "aluno.maria",
        email: "maria@escola.com",
        first_name: "Maria",
        last_name: "Souza",
        role: "ALUNO",
        escola: 1,
      };
      vi.mocked(api.get).mockResolvedValueOnce(alunoUser);

      const user = await requireAuth({
        allowedRoles: ["ALUNO"],
        location: { pathname: "/aluno" },
      });

      expect(user).toEqual(alunoUser);
    });
  });

  // ─── 3. Usuário já logado acessando /entrar (beforeLoad de /entrar) ─────────
  describe("Route.beforeLoad de /entrar", () => {
    it("redireciona usuário autenticado para seu painel (ex: ALUNO -> /aluno)", async () => {
      const alunoUser: Usuario = {
        id: 1,
        username: "aluno.maria",
        email: "maria@escola.com",
        first_name: "Maria",
        last_name: "Souza",
        role: "ALUNO",
        escola: 1,
      };
      vi.mocked(api.get).mockResolvedValueOnce(alunoUser);

      await expect(Route.beforeLoad!({} as any)).rejects.toEqual(
        expect.objectContaining({
          isRedirect: true,
          to: "/aluno",
        }),
      );
    });

    it("permite acesso se não houver usuário logado", async () => {
      vi.mocked(api.get).mockRejectedValueOnce(new ApiError(401, "Não autenticado"));

      // Não deve lançar redirect
      await expect(Route.beforeLoad!({} as any)).resolves.toBeUndefined();
    });
  });

  // ─── 4. Submissão do login na tela ──────────────────────────────────────────
  describe("Submissão do formulário de login", () => {
    it("login com sucesso redireciona aluno para /aluno", async () => {
      vi.mocked(api.post).mockResolvedValueOnce({ detail: "Login realizado com sucesso." });
      vi.mocked(api.get).mockResolvedValueOnce({
        id: 10,
        username: "aluna1",
        email: "aluna1@escola.com",
        first_name: "Ana",
        last_name: "Lima",
        role: "ALUNO",
        escola: 1,
      });

      render(<EntrarComponent />);

      fireEvent.change(screen.getByLabelText(/usuário ou e-mail/i), {
        target: { value: "aluna1" },
      });
      fireEvent.change(screen.getByLabelText(/senha/i), {
        target: { value: "senha123" },
      });

      fireEvent.click(screen.getByRole("button", { name: /^entrar/i }));

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith("/api/auth/login/", {
          username: "aluna1",
          password: "senha123",
        });
        expect(api.get).toHaveBeenCalledWith("/api/auth/me/");
        expect(mockNavigate).toHaveBeenCalledWith({ to: "/aluno" });
      });
    });

    it("login com sucesso redireciona professor para /professor", async () => {
      vi.mocked(api.post).mockResolvedValueOnce({ detail: "Login realizado com sucesso." });
      vi.mocked(api.get).mockResolvedValueOnce({
        id: 20,
        username: "prof1",
        email: "prof1@escola.com",
        first_name: "Carlos",
        last_name: "Ferreira",
        role: "PROFESSOR",
        escola: 1,
      });

      render(<EntrarComponent />);

      fireEvent.change(screen.getByLabelText(/usuário ou e-mail/i), {
        target: { value: "prof1" },
      });
      fireEvent.change(screen.getByLabelText(/senha/i), {
        target: { value: "senha123" },
      });

      fireEvent.click(screen.getByRole("button", { name: /^entrar/i }));

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith({ to: "/professor" });
      });
    });

    it("login com sucesso redireciona coordenação para /coordenacao", async () => {
      vi.mocked(api.post).mockResolvedValueOnce({ detail: "Login realizado com sucesso." });
      vi.mocked(api.get).mockResolvedValueOnce({
        id: 30,
        username: "coord1",
        email: "coord1@escola.com",
        first_name: "Helena",
        last_name: "Ramos",
        role: "COORDENACAO",
        escola: 1,
      });

      render(<EntrarComponent />);

      fireEvent.change(screen.getByLabelText(/usuário ou e-mail/i), {
        target: { value: "coord1" },
      });
      fireEvent.change(screen.getByLabelText(/senha/i), {
        target: { value: "senha123" },
      });

      fireEvent.click(screen.getByRole("button", { name: /^entrar/i }));

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith({ to: "/coordenacao" });
      });
    });

    it("login respeita parâmetro de redirect se for caminho interno seguro", async () => {
      mockSearch.mockReturnValue({ redirect: "/aluno/ciclos/1" });

      vi.mocked(api.post).mockResolvedValueOnce({ detail: "Login realizado com sucesso." });
      vi.mocked(api.get).mockResolvedValueOnce({
        id: 10,
        username: "aluna1",
        email: "aluna1@escola.com",
        first_name: "Ana",
        last_name: "Lima",
        role: "ALUNO",
        escola: 1,
      });

      render(<EntrarComponent />);

      fireEvent.change(screen.getByLabelText(/usuário ou e-mail/i), {
        target: { value: "aluna1" },
      });
      fireEvent.change(screen.getByLabelText(/senha/i), {
        target: { value: "senha123" },
      });

      fireEvent.click(screen.getByRole("button", { name: /^entrar/i }));

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith({ to: "/aluno/ciclos/1" });
      });
    });

    it("login com credenciais inválidas exibe mensagem acolhedora sem vazar dados", async () => {
      vi.mocked(api.post).mockRejectedValueOnce(new ApiError(401, "No active account found with the given credentials"));

      render(<EntrarComponent />);

      fireEvent.change(screen.getByLabelText(/usuário ou e-mail/i), {
        target: { value: "errado@escola.com" },
      });
      fireEvent.change(screen.getByLabelText(/senha/i), {
        target: { value: "senhaerrada" },
      });

      fireEvent.click(screen.getByRole("button", { name: /^entrar/i }));

      await waitFor(() => {
        const errorAlert = screen.getByRole("alert");
        expect(errorAlert).toBeInTheDocument();
        expect(errorAlert).toHaveTextContent("Não foi possível entrar. Verifique seu usuário e senha e tente novamente.");
      });
    });
  });
});
