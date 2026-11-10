import { createFileRoute, Link, useNavigate, redirect } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { Logo } from "@/components/Logo";
import { api, ApiError } from "@/lib/api";
import { getSession, ROLE_PANELS, sanitizeRedirect } from "@/lib/auth";
import type { Usuario } from "@/types/api";

interface EntrarSearchParams {
  redirect?: string;
}

export const Route = createFileRoute("/entrar")({
  validateSearch: (search: Record<string, unknown>): EntrarSearchParams => {
    return {
      redirect: typeof search.redirect === "string" ? search.redirect : undefined,
    };
  },
  beforeLoad: async () => {
    // Se o usuário já estiver logado e abrir /entrar, redireciona direto para o painel do papel dele
    const user = await getSession();
    if (user) {
      const panel = ROLE_PANELS[user.role] || "/";
      throw redirect({ to: panel });
    }
  },
  head: () => ({
    meta: [
      { title: "Entrar — Trilha" },
      {
        name: "description",
        content:
          "Acesse sua conta Trilha para compartilhar experiências de aprendizagem e acompanhar conversas pedagógicas.",
      },
      { property: "og:title", content: "Entrar — Trilha" },
      {
        property: "og:description",
        content: "Acesse sua conta Trilha e participe da escuta que vira caminho.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Entrar,
});

type Mode = "entrar" | "criar" | "recuperar" | "pronto";

const input =
  "w-full rounded-md border border-input bg-background px-4 py-3 text-sm outline-none focus:border-primary disabled:opacity-50 disabled:cursor-not-allowed";

function Field({
  id,
  label,
  type = "text",
  placeholder,
  value,
  onChange,
  disabled,
}: {
  id: string;
  label: string;
  type?: string;
  placeholder?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-foreground">
        {label}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        required
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        disabled={disabled}
        className={input}
      />
    </div>
  );
}

function Entrar() {
  const [mode, setMode] = useState<Mode>("entrar");
  const [doneMsg, setDoneMsg] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const navigate = useNavigate();
  const search = Route.useSearch();

  const handleLoginSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setLoading(true);

    try {
      // 1. Enviar credenciais para POST /api/auth/login/
      await api.post("/api/auth/login/", {
        username,
        password,
      });

      // 2. Obter dados do usuário em GET /api/auth/me/
      const user = await api.get<Usuario>("/api/auth/me/");

      // 3. Redirecionamento por papel ou destino preservado
      const safeRedirect = sanitizeRedirect(search.redirect);
      if (safeRedirect) {
        navigate({ to: safeRedirect });
      } else {
        const panel = ROLE_PANELS[user.role] || "/";
        navigate({ to: panel });
      }
    } catch (err) {
      if (err instanceof ApiError && (err.status === 401 || err.status === 400)) {
        setErrorMessage("Não foi possível entrar. Verifique seu usuário e senha e tente novamente.");
      } else {
        setErrorMessage("Ocorreu um erro ao conectar ao serviço. Tente novamente em instantes.");
      }
    } finally {
      setLoading(false);
    }
  };

  const submit = (e: FormEvent, msg: string) => {
    e.preventDefault();
    setDoneMsg(msg);
    setMode("pronto");
  };

  const titles: Record<Mode, [string, string]> = {
    entrar: ["Bem-vindo de volta", "Entre para continuar sua trilha."],
    criar: ["Comece sua trilha", "Crie sua conta para compartilhar como você aprende."],
    recuperar: ["Recuperar acesso", "Informe seu e-mail para receber as instruções."],
    pronto: ["Tudo certo", doneMsg],
  };

  const btn =
    "group inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-5 py-3 text-sm font-bold text-primary-foreground transition-colors hover:bg-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mustard disabled:opacity-50 disabled:cursor-not-allowed";
  const linkBtn = "font-bold text-primary underline-offset-4 hover:underline";

  return (
    <div className="grid min-h-screen bg-background text-foreground lg:grid-cols-2">
      <aside className="relative hidden overflow-hidden bg-primary p-12 text-primary-foreground lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -right-32 -top-32 h-[28rem] w-[28rem] rounded-full border border-primary-foreground/15" />
        <div className="absolute -right-16 -top-16 h-[20rem] w-[20rem] rounded-full border border-primary-foreground/15" />
        <Link to="/" className="relative inline-flex w-fit rounded-md bg-background px-4 py-3">
          <Logo className="h-10 md:h-12" />
        </Link>
        <div className="relative">
          <p className="eyebrow flex items-center gap-3 text-accent">
            <span className="h-px w-8 bg-mustard" />
            Escuta que vira caminho
          </p>
          <h2 className="mt-6 max-w-md font-serif text-5xl leading-tight">Ouvir também ensina.</h2>
          <p className="mt-6 max-w-sm text-primary-foreground/75">
            Sua experiência pode melhorar a próxima aula.
          </p>
        </div>
        <p className="relative font-serif italic text-accent">
          Escuta respeitosa. Aprendizagem em movimento.
        </p>
      </aside>

      <main className="flex flex-col px-6 py-10 md:px-16">
        <div className="flex items-center justify-between">
          <Link to="/" className="lg:hidden">
            <Logo variant="simbolo" className="h-12 md:h-14" />
          </Link>
          <Link
            to="/"
            className="ml-auto inline-flex items-center gap-2 text-sm font-bold text-primary underline-offset-4 hover:underline"
          >
            <ArrowLeft className="h-4 w-4" /> Voltar ao início
          </Link>
        </div>

        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-12">
          <p className="eyebrow flex items-center gap-3">
            <span className="h-px w-8 bg-mustard" />
            Sua conta
          </p>
          <h1 className="mt-5 text-4xl font-medium md:text-5xl">{titles[mode][0]}</h1>
          <p className="mt-3 text-muted-foreground">{titles[mode][1]}</p>

          {mode === "entrar" && (
            <form className="mt-8 space-y-5" onSubmit={handleLoginSubmit}>
              {errorMessage && (
                <div className="rounded-md border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive" role="alert">
                  {errorMessage}
                </div>
              )}
              <Field
                id="username"
                label="Usuário ou E-mail"
                type="text"
                placeholder="seu.usuario"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={loading}
              />
              <Field
                id="senha"
                label="Senha"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
              <div className="text-right text-sm">
                <button
                  type="button"
                  className={linkBtn}
                  onClick={() => setMode("recuperar")}
                  disabled={loading}
                >
                  Esqueci minha senha
                </button>
              </div>
              <button type="submit" className={btn} disabled={loading}>
                {loading ? "Entrando..." : "Entrar"}{" "}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </button>
              <p className="text-center text-sm text-muted-foreground">
                Ainda não tem conta?{" "}
                <button
                  type="button"
                  className={linkBtn}
                  onClick={() => setMode("criar")}
                  disabled={loading}
                >
                  Criar conta
                </button>
              </p>
            </form>
          )}

          {mode === "criar" && (
            <form
              className="mt-8 space-y-5"
              onSubmit={(e) => submit(e, "Sua conta foi criada. Agora é só entrar e começar.")}
            >
              <Field id="nome" label="Nome" placeholder="Como você quer ser chamado" />
              <Field id="email" label="E-mail" type="email" placeholder="voce@escola.com" />
              <Field
                id="senha"
                label="Senha"
                type="password"
                placeholder="Mínimo de 8 caracteres"
              />
              <button type="submit" className={btn}>
                Criar conta{" "}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </button>
              <p className="text-center text-sm text-muted-foreground">
                Já tem conta?{" "}
                <button type="button" className={linkBtn} onClick={() => setMode("entrar")}>
                  Entrar
                </button>
              </p>
            </form>
          )}

          {mode === "recuperar" && (
            <form
              className="mt-8 space-y-5"
              onSubmit={(e) =>
                submit(
                  e,
                  "Se o e-mail estiver cadastrado, você receberá as instruções em instantes.",
                )
              }
            >
              <Field id="email" label="E-mail" type="email" placeholder="voce@escola.com" />
              <button type="submit" className={btn}>
                Enviar instruções{" "}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </button>
              <p className="text-center text-sm">
                <button type="button" className={linkBtn} onClick={() => setMode("entrar")}>
                  Voltar para entrar
                </button>
              </p>
            </form>
          )}

          {mode === "pronto" && (
            <div className="mt-8 rounded-lg border border-border bg-card p-6 shadow-sage">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-accent">
                <Check className="h-5 w-5 text-primary" />
              </span>
              <p className="mt-4 font-serif text-xl">{doneMsg}</p>
              <button type="button" className={`${btn} mt-6`} onClick={() => setMode("entrar")}>
                Ir para entrar{" "}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
