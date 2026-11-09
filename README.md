# Trilha — Avaliação de Professores

> **Escuta que vira caminho.**  
> Uma experiência acolhedora e editorial para estudantes compartilharem como aprendem e escolas transformarem percepções em aprimoramento pedagógico.

---

## 🛠️ Tecnologias Utilizadas

- **Frontend:** [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Framework & Roteamento:** [TanStack Start](https://tanstack.com/start) & [TanStack Router](https://tanstack.com/router)
- **Bundler:** [Vite 8](https://vite.dev/) (com suporte nativo a `tsconfigPaths`)
- **Estilização:** [Tailwind CSS v4](https://tailwindcss.com/)
- **Ícones:** [Lucide React](https://lucide.dev/)
- **Backend (planejado):** Django + Django REST Framework
- **Banco de Dados:** PostgreSQL (Supabase) via API Django

---

## 📁 Estrutura de Pastas Simplificada

```text
Trilha/
├── public/                     # Assets estáticos servidos diretamente pelo Vite
│   ├── favicon.ico
│   ├── logo-completo.png       # Logo principal horizontal
│   ├── logo-simbolo.png        # Símbolo do livro com caminho
│   ├── logo-texto.png          # Tipografia do nome Trilha
│   └── robots.txt
├── src/
│   ├── components/             # Componentes React
│   │   ├── ui/                 # Biblioteca base de componentes de interface
│   │   └── Logo.tsx            # Componente de exibição dos logos
│   ├── lib/                    # Funções utilitárias
│   ├── routes/                 # Rotas baseadas em arquivos (TanStack Router)
│   │   ├── __root.tsx          # Shell raiz da aplicação (HTML, meta, fontes)
│   │   ├── index.tsx           # Landing page oficial
│   │   └── entrar.tsx          # Tela de login / cadastro
│   ├── test/                   # Testes automatizados (Vitest)
│   ├── routeTree.gen.ts        # Árvore de rotas do TanStack
│   ├── router.tsx              # Configuração do router
│   ├── server.ts               # Handler do servidor SSR
│   ├── start.ts                # Entrypoint TanStack Start
│   └── styles.css              # Estilos globais e tokens de cores Tailwind
├── identidadeVisual/           # Brandbook e assets originais em alta resolução
├── .env.example                # Modelo de variáveis de ambiente (API URL)
├── .gitignore                  # Arquivos ignorados pelo Git
├── package.json                # Dependências e scripts do projeto
└── vite.config.ts              # Configuração simplificada e nativa do Vite 8
```

---

## 🚀 Como Rodar o Projeto Localmente

### Pré-requisitos

- **Node.js** (versão 20 ou superior recomendada)
- **npm** (incluso com Node.js)

### 1. Clonar o repositório

```bash
git clone https://github.com/eduroqu3/Trilha.git
cd Trilha
```

### 2. Configurar variáveis de ambiente

Copie o arquivo de exemplo para `.env`:

```bash
cp .env.example .env
```

*(No Windows PowerShell: `Copy-Item .env.example .env`)*

### 3. Instalar as dependências

```bash
npm install
```

### 4. Executar o ambiente de desenvolvimento

```bash
npm run dev
```

Acesse a aplicação no navegador em: **[http://localhost:3000](http://localhost:3000)**.

---

## 📜 Scripts Disponíveis

| Comando | Descrição |
|---|---|
| `npm run dev` | Inicia o servidor local de desenvolvimento na porta 3000 |
| `npm run build` | Compila a aplicação para produção (client + SSR nativo) em `dist/` |
| `npm run preview` | Executa o preview local da build de produção |
| `npm test` | Roda os testes com Vitest |
| `npm run lint` | Executa a verificação estática de código com ESLint |
| `npm run format` | Formata todo o código com Prettier |
