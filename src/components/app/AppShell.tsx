import { Link, useNavigate } from "@tanstack/react-router";
import { LogOut, User } from "lucide-react";
import { Logo } from "@/components/Logo";
import { api } from "@/lib/api";

interface AppShellProps {
  /** Nome completo ou username do usuário logado. */
  userName: string;
  children: React.ReactNode;
}

/**
 * Layout base do sistema interno.
 * Reutiliza os tokens visuais (Fraunces/Manrope, shadow-sage, eyebrow)
 * já presentes na landing e na tela de login.
 */
export function AppShell({ userName, children }: AppShellProps) {
  const navigate = useNavigate();

  async function handleLogout() {
    await api.post("/api/auth/logout/").catch(() => {});
    navigate({ to: "/" });
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-6 px-6 md:px-10">
          <Link to="/" className="flex items-center gap-3">
            <Logo className="h-9 md:h-10" />
          </Link>

          <div className="flex items-center gap-4">
            <span className="hidden items-center gap-2 text-sm text-muted-foreground sm:flex">
              <User className="h-4 w-4 shrink-0" />
              <span className="font-medium text-foreground">{userName}</span>
            </span>

            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-bold text-primary transition-colors hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mustard"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-6 py-10 md:px-10">{children}</main>
    </div>
  );
}
