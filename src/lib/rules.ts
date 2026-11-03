export type Role = "admin" | "coordenacao" | "professor" | "aluno";

export const ROLE_HOME: Record<Role, string> = {
  admin: "/admin",
  coordenacao: "/coordenacao",
  professor: "/professor",
  aluno: "/aluno",
};

export const ROLE_LABEL: Record<Role, string> = {
  admin: "Administração",
  coordenacao: "Coordenação",
  professor: "Professor",
  aluno: "Aluno",
};

// Which roles each role may create accounts for.
export const CAN_CREATE: Record<Role, Role[]> = {
  admin: ["coordenacao"],
  coordenacao: ["professor", "aluno"],
  professor: [],
  aluno: [],
};

export function average(scores: number[]): number | null {
  if (scores.length === 0) return null;
  return Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10;
}

export function isValidScore(n: number): boolean {
  return Number.isInteger(n) && n >= 1 && n <= 5;
}

/** Parses "Nome; email" lines for batch student import. */
export function parseBatch(text: string): { full_name: string; email: string }[] {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const [name, email] = l.split(/[;,\t]/).map((s) => s?.trim() ?? "");
      return { full_name: name ?? "", email: (email ?? "").toLowerCase() };
    })
    .filter((r) => r.full_name && /.+@.+\..+/.test(r.email));
}

export function tempPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let s = "";
  const arr = new Uint32Array(10);
  crypto.getRandomValues(arr);
  for (const n of arr) s += chars[n % chars.length];
  return s;
}

export const fmt = (n: number | null) => (n == null ? "—" : n.toFixed(1).replace(".", ","));
