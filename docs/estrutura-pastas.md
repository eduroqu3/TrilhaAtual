# Estrutura de Pastas e Padrões de Código — Trilha

Este guia descreve a organização do repositório, convenções de nomenclatura e diretrizes arquiteturais para orientar o desenvolvimento de novas features e refatorações.

---

## 1. Visão Geral da Arquitetura de Pastas

```text
Trilha/
├── docs/                       # Documentação técnica, arquitetura e guia de marca
│   ├── assets/                 # Imagens e materiais brutos de identidade visual
│   ├── arquitetura.md          # Visão de arquitetura e integração frontend/backend
│   ├── estrutura-pastas.md     # Este guia detalhado da árvore de diretórios
│   ├── identidade-visual.md    # Cores, fontes, tokens e uso das logos
│   └── trilha-brand-landing.md # Transcrição editorial original do design
│
├── public/                     # Arquivos estáticos servidos diretamente na raiz
│   ├── favicon.ico             # Ícone da aba do navegador
│   ├── logo-completo.png       # Logo principal otimizada (Símbolo + Texto)
│   ├── logo-simbolo.png        # Símbolo estilizado otimizado
│   ├── logo-texto.png          # Tipografia "Trilha." otimizada
│   └── robots.txt              # Diretrizes para indexadores
│
├── src/                        # Código-fonte da aplicação React
│   ├── components/             # Componentes React
│   │   ├── ui/                 # Componentes base acessíveis (Radix UI / Tailwind)
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── input.tsx
│   │   │   └── ...
│   │   └── Logo.tsx            # Componente de renderização padronizada do logo
│   │
│   ├── lib/                    # Helpers, utilitários puros e captura de erros
│   │   ├── error-capture.ts    # Capturador de exceções para logs controlados
│   │   ├── error-page.ts       # Template HTML de fallback para erros de SSR
│   │   └── utils.ts            # Função cn() (clsx + tailwind-merge)
│   │
│   ├── routes/                 # File-based routing (TanStack Router)
│   │   ├── __root.tsx          # Shell mestre da aplicação (Head, Fonts, RootOutlet)
│   │   ├── index.tsx           # Rota "/" (Landing page completa)
│   │   ├── entrar.tsx          # Rota "/entrar" (Autenticação / Cadastro)
│   │   └── README.md           # Guia de convenções de roteamento do TanStack
│   │
│   ├── test/                   # Configuração e testes automatizados
│   │   ├── app-routing.test.tsx# Testes de integridade de rotas
│   │   └── setup.ts            # Setup do ambiente JSDOM e Jest DOM
│   │
│   ├── router.tsx              # Instância do createRouter com tipagem estrita
│   ├── routeTree.gen.ts        # Árvore gerada automaticamente pelo TanStack Start
│   ├── server.ts               # Servidor SSR com pipeline de normalização de erro
│   ├── start.ts                # Inicializador do TanStack Start com middlewares
│   └── styles.css              # Ponto de entrada CSS, Tailwind v4 e variáveis @theme
│
├── .env                        # Variáveis de ambiente locais (ignorado no git)
├── .env.example                # Modelo versionado de variáveis de ambiente
├── .gitignore                  # Arquivos e pastas excluídos do controle de versão
├── .prettierrc                 # Regras de formatação (largura, aspas, quebra de linha)
├── eslint.config.js            # Configurações de linter (ESLint 9 Flat Config)
├── package.json                # Declaração de dependências e scripts npm
├── README.md                   # Manual de introdução e inicialização do projeto
├── tsconfig.json               # Configurações do compilador TypeScript e aliases (@/*)
├── vite.config.ts              # Configuração simplificada e moderna do Vite 8
└── vitest.config.ts            # Configuração do executor de testes Vitest
```

---

## 2. Convenções de Pastas

### `src/routes/` (Roteamento)

O roteamento utiliza a especificação do **TanStack Router**:

- Arquivos `.tsx` nesta pasta tornam-se rotas automaticamente.
- `index.tsx` mapeia para `/`.
- `entrar.tsx` mapeia para `/entrar`.
- Pastas com subarquivos representam caminhos aninhados (ex.: `professores/$id.tsx` mapeará para `/professores/:id`).
- Nunca crie pastas `pages/` ou convenções estilo Next.js (`app/layout.tsx`). O layout raiz global deve permanecer exclusivamente em `src/routes/__root.tsx`.

### `src/components/`

- Componentes genéricos de UI ficam na pasta `src/components/ui/` (ex.: inputs, botões, modais).
- Componentes de domínio ou blocos de página compartilhados devem ser posicionados na raiz de `src/components/` ou em subpastas semânticas (ex.: `src/components/professores/`).

### `src/lib/`

- Deve conter apenas utilitários puros, funções sem JSX e clientes de API.
- Exemplo: para serviços de comunicação HTTP futuros com o Django, criar `src/lib/api.ts`.

---

## 3. Padrão de Aliases do TypeScript

O projeto está configurado com path aliases mapeados para a raiz do código-fonte:

```typescript
import { Logo } from "@/components/Logo";
import { cn } from "@/lib/utils";
```

Não utilize caminhos relativos longos (como `../../components/Logo`). O Vite 8 resolve `@/*` diretamente pelo `tsconfig.json` através de `resolve: { tsconfigPaths: true }`.

---

## 4. Regras para Novas Adições

1. **Estilos:** Priorize utilitários Tailwind CSS v4 integrados aos tokens do projeto (`primary`, `mustard`, `accent`, `sage`, `cream`).
2. **Ícones:** Utilize a biblioteca [`lucide-react`](https://lucide.dev/).
3. **Imagens:** Imagens estáticas e assets de tela devem ser colocados em `public/` e referenciados por caminho absoluto (ex.: `/minha-imagem.png`).
4. **Validação:** Sempre execute `npm run build` e `npm test` antes de submeter alterações para garantir conformidade de tipos e SSR.
