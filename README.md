# Trilha — Avaliação de Professores

> **Escuta que vira caminho.**  
> Uma plataforma acolhedora e editorial para estudantes compartilharem como aprendem, e escolas transformarem percepções em aprimoramento pedagógico.

---

## Sumário

- [Sobre o Projeto](#sobre-o-projeto)
- [Stack Tecnológica](#stack-tecnológica)
- [Arquitetura](#arquitetura)
- [Identidade Visual](#identidade-visual)
- [Estrutura de Pastas](#estrutura-de-pastas)
- [Início Rápido](#início-rápido)
- [Scripts](#scripts)
- [Convenções de Desenvolvimento](#convenções-de-desenvolvimento)
- [Princípios do Projeto](#princípios-do-projeto)

---

## Sobre o Projeto

A **Trilha** é uma plataforma de avaliação de professores centrada na escuta ativa e no diálogo pedagógico construtivo. Estudantes compartilham suas experiências de aprendizado de forma anônima e respeitosa, gerando percepções que ajudam escolas a investir no desenvolvimento docente — sem rankings punitivos ou exposição negativa.

**Tagline:** _Escuta respeitosa. Aprendizagem em movimento._

---

## Stack Tecnológica

| Camada | Tecnologia |
| --- | --- |
| **Frontend** | React 19 + TypeScript |
| **Framework & Roteamento** | TanStack Start + TanStack Router |
| **Bundler** | Vite 8 (com `tsconfigPaths` nativo) |
| **Estilização** | Tailwind CSS v4 |
| **Ícones** | Lucide React |
| **Backend (planejado)** | Python + Django REST Framework |
| **Banco de Dados** | PostgreSQL hospedado no Supabase (acesso exclusivo via Django) |

---

## Arquitetura

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

| Camada | Responsabilidade |
| --- | --- |
| **Frontend** | Renderização de telas, UX/UI, navegação SPA/SSR, validação client-side |
| **Backend** | Regras de negócio, autenticação JWT, autorização RBAC, endpoints REST |
| **Database** | Persistência relacional — acesso **exclusivo** do Django via ORM |

### Regra de Ouro: Sem Acesso Direto ao Banco

O frontend **não** acessa o banco de dados diretamente. Toda comunicação passa pelos endpoints da API Django REST. Isso previne vazamento de credenciais e centraliza as regras de moderação pedagógica.

A URL do backend é configurada via variável de ambiente:

```env
# .env
VITE_API_URL="http://localhost:8000/api"
```

Exemplo de chamada de API em `src/lib/api.ts`:

```typescript
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

export async function fetchProfessores(query?: string) {
  const url = new URL(`${API_URL}/professores/`);
  if (query) url.searchParams.set("search", query);

  const response = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) throw new Error(`Erro: ${response.statusText}`);
  return response.json();
}
```

### Fluxo de Autenticação Planejado

1. Usuário preenche credenciais em `/entrar`.
2. Frontend envia `POST /api/auth/login/` para o Django.
3. Django valida e retorna tokens (ou seta cookies HTTP-Only seguros).
4. TanStack Router gerencia o estado de sessão protegendo rotas privadas.

---

## Identidade Visual

> **Conceito Central:** _Escuta que vira caminho._  
> Abordagem editorial, humana e pedagógica — sem a frieza de painéis analíticos tradicionais.

### Logotipos

Os logotipos estão em `public/` e são servidos diretamente pelo Vite:

| Arquivo | Descrição | Uso Recomendado |
| --- | --- | --- |
| `logo-completo.png` | Símbolo + tipografia "Trilha." horizontal | Cabeçalho, hero e documentos |
| `logo-simbolo.png` | Livro estilizado com trilha ascendente | Favicon, avatares, formato compacto |
| `logo-texto.png` | Logotipia serifada "Trilha." | Rodapé sobre fundo escuro |

Componente de renderização padronizada em `src/components/Logo.tsx`:

```tsx
import { Logo } from "@/components/Logo";

<Logo className="h-11 md:h-12" />               // padrão (completo)
<Logo variant="simbolo" className="h-12 md:h-14" />
<Logo variant="texto" className="h-9 md:h-10" />
```

### Paleta de Cores (Design Tokens — Oklch)

| Token | Hex aprox. | Propósito |
| --- | --- | --- |
| `cream` / `background` | `#FAF6EE` | Fundo principal da página |
| `warm-sand` / `secondary` | `#F0E9DA` | Fundo de seções alternadas |
| `deep-green` / `primary` | `#216B58` | Botões primários, seções em destaque |
| `dark-green` / `foreground` | `#243A31` | Tipografia de alto contraste |
| `forest` | `#1A2F26` | Rodapé e faixas profundas |
| `pale-green` / `accent` | `#DCE8D4` | Badges, sombras sutis |
| `sage` | `#9DBBA1` | Barras, ilustrações e visuais |
| `mustard` | `#E6A447` | Eyebrows, estrelas e sombras quentes |
| `body-gray` / `muted-foreground` | `#718078` | Parágrafos de apoio e legendas |
| `line-gray` / `border` | `#D7D2C7` | Linhas divisórias e bordas |

### Tipografia

- **Títulos & Citações:** `Fraunces` (serifada editorial) — aplicada em `h1–h4` e `font-serif`.
- **Corpo & Interface:** `Manrope` (sans-serif geométrica) — aplicada em `body`, menus e formulários.

### Elementos Gráficos

**Eyebrow** (rótulo de seção):
```tsx
<p className="eyebrow flex items-center gap-3">
  <span className="h-px w-8 bg-mustard" />
  Escuta que vira caminho
</p>
```

**Sombras Deslocadas (Brutalismo Editorial):**
- `.shadow-sage` — sombra sólida verde pálido (`14px 14px 0 0 var(--accent)`)
- `.shadow-mustard` — sombra sólida mostarda (`12px 12px 0 0 var(--mustard)`)
- `.shadow-duo` — camada dupla `primary` + `mustard`

---

## Estrutura de Pastas

```text
Trilha/
├── public/                     # Assets estáticos servidos diretamente na raiz
│   ├── favicon.ico
│   ├── logo-completo.png       # Logo principal horizontal
│   ├── logo-simbolo.png        # Símbolo do livro com trilha
│   ├── logo-texto.png          # Tipografia "Trilha."
│   └── robots.txt
│
├── src/                        # Código-fonte da aplicação React
│   ├── components/
│   │   ├── ui/                 # Componentes base acessíveis (Radix UI + Tailwind)
│   │   └── Logo.tsx            # Componente de renderização padronizada do logo
│   │
│   ├── lib/                    # Utilitários puros e clientes de API
│   │   ├── error-capture.ts    # Capturador de exceções para logs controlados
│   │   ├── error-page.ts       # HTML de fallback para erros de SSR
│   │   └── utils.ts            # Função cn() (clsx + tailwind-merge)
│   │
│   ├── routes/                 # File-based routing (TanStack Router)
│   │   ├── __root.tsx          # Shell raiz (Head, fontes, RootOutlet)
│   │   ├── index.tsx           # Rota "/" — Landing page
│   │   ├── entrar.tsx          # Rota "/entrar" — Autenticação
│   │   └── README.md           # Convenções de roteamento TanStack
│   │
│   ├── test/                   # Testes automatizados
│   │   ├── app-routing.test.tsx
│   │   └── setup.ts
│   │
│   ├── router.tsx              # createRouter com tipagem estrita
│   ├── routeTree.gen.ts        # Árvore gerada automaticamente
│   ├── server.ts               # Handler SSR
│   ├── start.ts                # Entrypoint TanStack Start
│   └── styles.css              # Estilos globais e tokens Tailwind v4
│
├── .env                        # Variáveis locais (ignorado no git)
├── .env.example                # Modelo versionado de variáveis
├── .gitignore
├── .prettierrc                 # Regras de formatação
├── eslint.config.js            # ESLint 9 Flat Config
├── package.json
├── README.md                   # Este arquivo
├── tsconfig.json               # Compilador TS e aliases (@/*)
├── vite.config.ts              # Configuração Vite 8
└── vitest.config.ts            # Configuração Vitest
```

---

## Início Rápido

**Pré-requisitos:** Node.js 20+

```bash
# 1. Clonar o repositório
git clone https://github.com/eduroqu3/Trilha.git
cd Trilha

# 2. Configurar variáveis de ambiente
cp .env.example .env          # Linux/macOS
Copy-Item .env.example .env   # Windows PowerShell

# 3. Instalar dependências
npm install

# 4. Iniciar servidor de desenvolvimento
npm run dev
```

Acesse em: **[http://localhost:3000](http://localhost:3000)**

---

## Scripts

| Comando | Descrição |
| --- | --- |
| `npm run dev` | Servidor local de desenvolvimento (porta 3000) |
| `npm run build` | Build de produção em `dist/` (client + SSR) |
| `npm run preview` | Preview local da build de produção |
| `npm test` | Roda os testes com Vitest |
| `npm run lint` | Verificação estática com ESLint |
| `npm run format` | Formatação com Prettier |

---

## Convenções de Desenvolvimento

### Roteamento

- Arquivos `.tsx` em `src/routes/` tornam-se rotas automaticamente.
- `index.tsx` → `/` | `entrar.tsx` → `/entrar`
- Subrotas aninhadas: `professores/$id.tsx` → `/professores/:id`
- O layout global fica **exclusivamente** em `src/routes/__root.tsx`.

### Componentes

- Componentes genéricos de UI → `src/components/ui/`
- Componentes de domínio → `src/components/` ou subpastas semânticas (ex.: `src/components/professores/`)
- `src/lib/` contém apenas utilitários puros e clientes HTTP — sem JSX.

### Aliases TypeScript

```typescript
import { Logo } from "@/components/Logo";
import { cn } from "@/lib/utils";
```

O Vite 8 resolve `@/*` via `resolve: { tsconfigPaths: true }`. Não use caminhos relativos longos.

### Novas Adições

1. **Estilos:** Use utilitários Tailwind v4 com os tokens do projeto (`primary`, `mustard`, `accent`, `sage`, `cream`).
2. **Ícones:** Apenas `lucide-react`.
3. **Imagens:** Coloque em `public/` e referencie por caminho absoluto (`/minha-imagem.png`).
4. **Validação:** Execute `npm run build` e `npm test` antes de qualquer commit.

---

## Princípios do Projeto

- **Escuta Ativa e Respeitosa:** A Trilha transforma percepções em diálogos pedagógicos construtivos, sem rankings ou exposição punitiva de docentes.
- **Simplicidade Técnica:** Bundle leve, sem dependências desnecessárias, priorizando estabilidade e execução local ágil.
- **Modularidade:** Novas rotas e páginas seguem o padrão TanStack Router, mantendo coerência com a paleta editorial.
