import { redirect } from "@tanstack/react-router";
import { api, ApiError } from "@/lib/api";
import type { Usuario, RoleEnum } from "@/types/api";

/** Mapeamento de papéis para as rotas correspondentes dos painéis */
export const ROLE_PANELS: Record<RoleEnum, string> = {
  ALUNO: "/aluno",
  PROFESSOR: "/professor",
  COORDENACAO: "/coordenacao",
  ADMIN: "/coordenacao",
};

/**
 * Obtém os dados do usuário autenticado a partir de /api/auth/me/.
 * Retorna null se não houver sessão ativa (401 / erro).
 */
export async function getSession(): Promise<Usuario | null> {
  try {
    const user = await api.get<Usuario>("/api/auth/me/", { skipRefresh: false });
    return user;
  } catch (error) {
    if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
      return null;
    }
    return null;
  }
}

/**
 * Valida se um caminho é estritamente interno e relativo para prevenir vulnerabilidades de open redirect.
 * Exemplo aceito: "/aluno", "/aluno/ciclos/1?foo=bar"
 * Exemplos rejeitados: "https://malicious.com", "//malicious.com", "javascript:..."
 */
export function sanitizeRedirect(url?: string | null): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  // Deve iniciar com / mas NÃO começar com // nem conter esquemas como http:, javascript:, etc.
  if (trimmed.startsWith("/") && !trimmed.startsWith("//") && !trimmed.includes("://") && !trimmed.startsWith("/\\")) {
    return trimmed;
  }
  return null;
}

export interface ProtectRouteOptions {
  allowedRoles?: RoleEnum[];
  location: {
    pathname: string;
    search?: Record<string, unknown>;
    href?: string;
  };
}

/**
 * Helper de beforeLoad para proteger rotas internas.
 * 1. Sem sessão -> redireciona para /entrar?redirect={caminho}
 * 2. Com sessão, mas papel não permitido -> redireciona para o painel correspondente ao papel
 * 3. Com sessão e papel permitido -> retorna o usuário
 */
export async function requireAuth({ allowedRoles, location }: ProtectRouteOptions): Promise<Usuario> {
  const user = await getSession();

  if (!user) {
    const originalPath = sanitizeRedirect(location.pathname) || "/";
    throw redirect({
      to: "/entrar",
      search: originalPath !== "/" && originalPath !== "/entrar" ? { redirect: originalPath } : undefined,
    });
  }

  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    const targetPanel = ROLE_PANELS[user.role] || "/";
    throw redirect({
      to: targetPanel,
    });
  }

  return user;
}
