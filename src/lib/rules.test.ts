import { describe, expect, it } from "vitest";
import { CAN_CREATE, ROLE_HOME, average, isValidScore, parseBatch } from "./rules";

describe("regras do sistema", () => {
  it("login redireciona cada perfil ao seu painel", () => {
    expect(ROLE_HOME.aluno).toBe("/aluno");
    expect(ROLE_HOME.coordenacao).toBe("/coordenacao");
  });
  it("admin só cria coordenadores; coordenação cria professores e alunos", () => {
    expect(CAN_CREATE.admin).toEqual(["coordenacao"]);
    expect(CAN_CREATE.coordenacao).toEqual(["professor", "aluno"]);
    expect(CAN_CREATE.aluno).toEqual([]);
  });
  it("notas vão de 1 a 5", () => {
    expect(isValidScore(0)).toBe(false);
    expect(isValidScore(6)).toBe(false);
    expect(isValidScore(3)).toBe(true);
  });
  it("média com uma casa decimal", () => {
    expect(average([4, 5, 4])).toBe(4.3);
    expect(average([])).toBeNull();
  });
  it("importação em lote ignora linhas inválidas", () => {
    expect(parseBatch("Ana; ana@x.com\nsem email\nBia,BIA@x.com")).toEqual([
      { full_name: "Ana", email: "ana@x.com" },
      { full_name: "Bia", email: "bia@x.com" },
    ]);
  });
});
