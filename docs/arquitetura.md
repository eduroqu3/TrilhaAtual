# Arquitetura e Integração Técnica — Trilha

Este documento detalha o desenho da arquitetura do projeto Trilha, definindo a separação de responsabilidades entre Frontend, Backend e Banco de Dados.

---

## 1. Visão Geral da Stack

```
[ Frontend: React 19 + TanStack Start ]
                  |
             (HTTP / JSON)
                  v
[ Backend: Django REST Framework ]
                  |
            (SQL / TCP)
                  v
[ Banco de Dados: PostgreSQL (Supabase) ]
```

### Divisão de Responsabilidades

| Camada       | Tecnologia                            | Responsabilidade Principal                                                                                                           |
| ------------ | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| **Frontend** | React 19, TanStack Start, Tailwind v4 | Renderização de telas, experiência do usuário (UX/UI), navegação SPA/SSR, validação de formulários client-side.                      |
| **Backend**  | Python, Django, Django REST Framework | Regras de negócio, autenticação (JWT/Session), autorização RBAC, endpoints de API REST, sanitização de dados e auditoria pedagógica. |
| **Database** | PostgreSQL hospedado no Supabase      | Persistência relacional, integridade referencial, índices e backups. O acesso ao banco é **exclusivo** do Django via ORM.            |

---

## 2. Princípios de Integração do Frontend

### Regra de Ouro: Sem Acesso Direto ao Banco

O frontend **não** deve utilizar clientes do Supabase (`@supabase/supabase-js`) nem realizar conexões diretas ao banco de dados:

- Todas as consultas e mutações (cadastro de avaliações, consulta de perfis, login de usuários) devem passar obrigatoriamente pelos endpoints da API Django REST.
- Isso previne vazamento de credenciais, centraliza as regras pedagógicas de moderação e garante controle total de permissões de acesso.

### Configuração de Ambiente

A URL do backend é injetada via variável de ambiente:

```env
# .env
VITE_API_URL="http://localhost:8000/api"
```

### Exemplo de Padrão para Chamadas de API no Frontend

Ao implementar novas funcionalidades, centralize os serviços de requisição em `src/lib/api.ts`:

```typescript
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

export async function fetchProfessores(query?: string) {
  const url = new URL(`${API_URL}/professores/`);
  if (query) url.searchParams.set("search", query);

  const response = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Erro ao buscar professores: ${response.statusText}`);
  }

  return response.json();
}
```

---

## 3. Fluxo de Autenticação Planejado

1. O usuário preenche credenciais na rota `/entrar`.
2. O formulário envia `POST /api/auth/login/` para o Django.
3. O Django valida as credenciais e retorna os tokens (ou seta cookies HTTP-Only seguros).
4. O TanStack Router gerencia o estado de sessão protegendo rotas administrativas ou de envio de avaliações.

---

## 4. Estratégia de Renderização e Deploy

- **Desenvolvimento Local:** Vite 8 com SSR integrado (`npm run dev`) rodando em `http://localhost:3000`.
- **Produção:**
  - `dist/client`: Arquivos estáticos otimizados (HTML, CSS minificado com Tailwind v4, bundles JS e imagens da pasta `public/`).
  - `dist/server`: Handler SSR do TanStack Start para carregamento inicial ultra-rápido e indexação SEO.
