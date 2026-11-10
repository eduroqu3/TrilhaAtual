/**
 * Testes dos componentes do sistema interno (Part 6A).
 * Testamos renderização e comportamento básico sem depender de rotas reais.
 */
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

// ─── Mocks de módulos externos ────────────────────────────────────────────────

// TanStack Router — apenas o necessário para AppShell (Link + useNavigate)
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to, className }: { children: React.ReactNode; to: string; className?: string }) => (
    <a href={to} className={className}>
      {children}
    </a>
  ),
  useNavigate: () => vi.fn(),
}));

// Logo
vi.mock("@/components/Logo", () => ({
  Logo: ({ className }: { className?: string }) => (
    <img src="/logo.png" alt="Trilha" className={className} />
  ),
}));

// api — evita fetch real
vi.mock("@/lib/api", () => ({
  api: { post: vi.fn().mockResolvedValue(undefined) },
}));

// ─── Imports após mocks ───────────────────────────────────────────────────────

import { AppShell } from "@/components/app/AppShell";
import { Card } from "@/components/app/Card";
import { Button } from "@/components/app/Button";
import { Field } from "@/components/app/Field";
import { EmptyState } from "@/components/app/EmptyState";
import { AvisoAnonimato } from "@/components/app/AvisoAnonimato";

// ─── AppShell ─────────────────────────────────────────────────────────────────

describe("AppShell", () => {
  it("renderiza o nome do usuário", () => {
    render(<AppShell userName="Ana Silva">conteúdo</AppShell>);
    expect(screen.getByText("Ana Silva")).toBeInTheDocument();
  });

  it("renderiza o conteúdo filho", () => {
    render(<AppShell userName="X"><p>filho</p></AppShell>);
    expect(screen.getByText("filho")).toBeInTheDocument();
  });

  it("exibe o botão Sair", () => {
    render(<AppShell userName="X">x</AppShell>);
    expect(screen.getByRole("button", { name: /sair/i })).toBeInTheDocument();
  });
});

// ─── Card ─────────────────────────────────────────────────────────────────────

describe("Card", () => {
  it("renderiza filhos", () => {
    render(<Card>conteúdo do card</Card>);
    expect(screen.getByText("conteúdo do card")).toBeInTheDocument();
  });

  it("aplica shadow-sage quando shadow='sage'", () => {
    const { container } = render(<Card shadow="sage">x</Card>);
    expect(container.firstChild).toHaveClass("shadow-sage");
  });

  it("aplica shadow-mustard quando shadow='mustard'", () => {
    const { container } = render(<Card shadow="mustard">x</Card>);
    expect(container.firstChild).toHaveClass("shadow-mustard");
  });
});

// ─── Button ───────────────────────────────────────────────────────────────────

describe("Button", () => {
  it("renderiza o texto", () => {
    render(<Button>Enviar</Button>);
    expect(screen.getByRole("button", { name: "Enviar" })).toBeInTheDocument();
  });

  it("chama onClick ao clicar", () => {
    const fn = vi.fn();
    render(<Button onClick={fn}>Clique</Button>);
    fireEvent.click(screen.getByRole("button"));
    expect(fn).toHaveBeenCalledOnce();
  });

  it("fica desabilitado quando disabled=true", () => {
    render(<Button disabled>Desabilitado</Button>);
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("aplica fullWidth", () => {
    const { container } = render(<Button fullWidth>OK</Button>);
    expect(container.firstChild).toHaveClass("w-full");
  });
});

// ─── Field ────────────────────────────────────────────────────────────────────

describe("Field", () => {
  it("renderiza label e input associados", () => {
    render(<Field id="email" label="E-mail" type="email" />);
    const input = screen.getByLabelText("E-mail");
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute("type", "email");
  });

  it("exibe mensagem de erro", () => {
    render(<Field id="nome" label="Nome" error="Campo obrigatório" />);
    expect(screen.getByText("Campo obrigatório")).toBeInTheDocument();
  });

  it("exibe hint quando não há erro", () => {
    render(<Field id="nome" label="Nome" hint="Mínimo 3 caracteres" />);
    expect(screen.getByText("Mínimo 3 caracteres")).toBeInTheDocument();
  });

  it("renderiza textarea quando as='textarea'", () => {
    render(<Field id="obs" label="Observação" as="textarea" />);
    expect(screen.getByRole("textbox")).toBeInstanceOf(HTMLTextAreaElement);
  });
});

// ─── EmptyState ───────────────────────────────────────────────────────────────

describe("EmptyState", () => {
  it("renderiza título e descrição", () => {
    render(
      <EmptyState
        title="Nenhuma avaliação"
        description="Você ainda não tem avaliações pendentes."
      />,
    );
    expect(screen.getByText("Nenhuma avaliação")).toBeInTheDocument();
    expect(screen.getByText("Você ainda não tem avaliações pendentes.")).toBeInTheDocument();
  });

  it("renderiza ação quando fornecida", () => {
    render(<EmptyState title="Vazio" action={<button>Criar</button>} />);
    expect(screen.getByRole("button", { name: "Criar" })).toBeInTheDocument();
  });
});

// ─── AvisoAnonimato ───────────────────────────────────────────────────────────

describe("AvisoAnonimato", () => {
  it("menciona proteção de identidade", () => {
    render(<AvisoAnonimato />);
    expect(screen.getByText(/sua identidade está protegida/i)).toBeInTheDocument();
  });

  it("menciona que respostas não são vinculadas ao nome", () => {
    render(<AvisoAnonimato />);
    expect(screen.getByText(/não são vinculadas ao seu nome/i)).toBeInTheDocument();
  });
});
