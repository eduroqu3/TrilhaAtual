/**
 * Tipos TypeScript derivados do schema OpenAPI do backend Trilha.
 * Fonte: GET /api/schema/ (drf-spectacular)
 *
 * Para regenerar:
 *   npx openapi-typescript http://localhost:8000/api/schema/ -o src/types/api.ts
 *
 * Os tipos abaixo refletem os serializers gerados nas Partes 1–4.
 */

// ─── Enums ────────────────────────────────────────────────────────────────────

export type RoleEnum = "ADMIN" | "COORDENACAO" | "PROFESSOR" | "ALUNO";

export type StatusCicloEnum = "RASCUNHO" | "ABERTO" | "FECHADO" | "PUBLICADO";

export type TipoPerguntaEnum = "ESCALA_1_5" | "TEXTO";

export type StatusModeracaoEnum = "PENDENTE" | "APROVADO" | "REJEITADO";

// ─── Accounts ─────────────────────────────────────────────────────────────────

export interface Usuario {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: RoleEnum;
  escola: number | null;
  escola_nome?: string;
}

export interface TokenPair {
  access: string;
  refresh: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

// ─── Escolas ──────────────────────────────────────────────────────────────────

export interface Escola {
  id: number;
  nome: string;
  limiar_minimo: number;
}

export interface Turma {
  id: number;
  escola: number;
  nome: string;
  ano: number;
}

export interface Disciplina {
  id: number;
  escola: number;
  nome: string;
}

export interface Matricula {
  id: number;
  aluno: number;
  turma: number;
}

export interface Vinculo {
  id: number;
  professor: number;
  professor_nome?: string;
  turma: number;
  turma_nome?: string;
  disciplina: number;
  disciplina_nome?: string;
}

export interface ImportacaoRequest {
  csv: File;
}

export interface ImportacaoResponse {
  criados: number;
  erros: ImportacaoErro[];
}

export interface ImportacaoErro {
  linha: number;
  mensagem: string;
}

// ─── Avaliações ───────────────────────────────────────────────────────────────

export interface CicloAvaliacao {
  id: number;
  escola: number;
  nome: string;
  abre_em: string; // ISO 8601
  fecha_em: string; // ISO 8601
  status: StatusCicloEnum;
}

export interface Pergunta {
  id: number;
  ciclo: number;
  texto: string;
  tipo: TipoPerguntaEnum;
  dimensao: string;
  ordem: number;
}

export interface PendenciaVinculo {
  ciclo_id: number;
  ciclo_nome: string;
  vinculo_id: number;
  professor_nome: string;
  disciplina_nome: string;
  turma_nome: string;
}

export interface QuestionarioVinculo {
  ciclo: Pick<CicloAvaliacao, "id" | "nome" | "status">;
  vinculo: Pick<Vinculo, "id" | "professor_nome" | "disciplina_nome" | "turma_nome">;
  perguntas: Pergunta[];
}

export interface RespostaEscalaInput {
  pergunta: number;
  valor: 1 | 2 | 3 | 4 | 5;
}

export interface RespostaTextoInput {
  pergunta: number;
  texto: string;
}

export interface AvaliacaoRequest {
  ciclo: number;
  vinculo: number;
  respostas_escala: RespostaEscalaInput[];
  respostas_texto: RespostaTextoInput[];
}

export interface AvaliacaoResponse {
  id: string; // UUID
  ciclo: number;
  vinculo: number;
}

// ─── Relatórios ───────────────────────────────────────────────────────────────

export interface ResumoVinculo {
  id: number;
  ciclo: number;
  ciclo_nome: string;
  vinculo: number;
  professor_nome: string;
  disciplina_nome: string;
  turma_nome: string;
  n_avaliacoes: number;
  medias_por_dimensao: Record<string, number>;
  media_geral: number;
  limiar_atingido: boolean;
}

export interface ParticipacaoTurma {
  turma_id: number;
  turma_nome: string;
  total_alunos: number;
  avaliadores: number;
  taxa_adesao: number; // 0–1
}

export interface ComentarioModeracao {
  id: number;
  texto: string;
  status_moderacao: StatusModeracaoEnum;
  dimensao: string;
}

export interface PatchComentario {
  status_moderacao: StatusModeracaoEnum;
}

// ─── Helpers de paginação ─────────────────────────────────────────────────────

export interface Page<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}
