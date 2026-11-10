/**
 * Cliente HTTP do Trilha.
 *
 * - Usa credentials: "include" para enviar cookies HttpOnly (JWT)
 * - Lê base URL de VITE_API_URL (fallback: http://localhost:8000)
 * - Intercepta 401 → tenta refresh, repete a request original
 * - Intercepta 403 → lança ApiError sem tentar refresh
 * - Serializa/desserializa JSON por padrão
 */

const BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:8000";

// ─── Tipos públicos ────────────────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly detail: string,
    public readonly data?: unknown,
  ) {
    super(detail);
    this.name = "ApiError";
  }
}

export interface RequestOptions extends RequestInit {
  /** Desabilita a tentativa automática de refresh ao receber 401. */
  skipRefresh?: boolean;
}

// ─── Helpers internos ─────────────────────────────────────────────────────────

function url(path: string): string {
  // Evita dupla barra se BASE_URL terminar com /
  return `${BASE_URL.replace(/\/$/, "")}${path}`;
}

async function parseBody(res: Response): Promise<unknown> {
  const ct = res.headers.get("content-type") ?? "";
  if (ct.includes("application/json")) return res.json();
  const text = await res.text();
  return text || null;
}

/** Tenta renovar o access token usando o refresh token nos cookies. */
async function refresh(): Promise<boolean> {
  try {
    const res = await fetch(url("/api/auth/refresh/"), {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
    });
    return res.ok;
  } catch {
    return false;
  }
}

// ─── Função principal ─────────────────────────────────────────────────────────

async function request<T = unknown>(
  method: string,
  path: string,
  body?: unknown,
  options: RequestOptions = {},
): Promise<T> {
  const { skipRefresh = false, headers: extraHeaders, ...rest } = options;

  const headers: Record<string, string> = {
    ...(extraHeaders as Record<string, string>),
  };
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  const init: RequestInit = {
    method,
    credentials: "include",
    headers,
    ...rest,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  };

  let res = await fetch(url(path), init);

  // Auto-refresh em 401
  if (res.status === 401 && !skipRefresh) {
    const ok = await refresh();
    if (ok) {
      res = await fetch(url(path), init);
    }
  }

  if (!res.ok) {
    const data = await parseBody(res);
    const detail =
      typeof data === "object" && data !== null && "detail" in data
        ? String((data as { detail: unknown }).detail)
        : res.statusText || `HTTP ${res.status}`;
    throw new ApiError(res.status, detail, data);
  }

  // 204 No Content
  if (res.status === 204) return undefined as T;

  return (await parseBody(res)) as T;
}

// ─── API pública ──────────────────────────────────────────────────────────────

export const api = {
  get<T = unknown>(path: string, options?: RequestOptions): Promise<T> {
    return request<T>("GET", path, undefined, options);
  },

  post<T = unknown>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return request<T>("POST", path, body, options);
  },

  patch<T = unknown>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return request<T>("PATCH", path, body, options);
  },

  put<T = unknown>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return request<T>("PUT", path, body, options);
  },

  delete<T = unknown>(path: string, options?: RequestOptions): Promise<T> {
    return request<T>("DELETE", path, undefined, options);
  },
};
