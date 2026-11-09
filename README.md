# Trilha — Avaliação de Professores

> **Escuta que vira caminho.**

Plataforma para estudantes avaliarem professores de forma respeitosa, ajudando escolas a transformar percepções em aprimoramento pedagógico.

📄 **[Documentação completa em `docs/`](./docs/README.md)**

---

## Início Rápido

**Pré-requisitos:** Node.js 20+

```bash
# 1. Clonar e entrar na pasta
git clone https://github.com/eduroqu3/Trilha.git
cd Trilha

# 2. Configurar variáveis de ambiente
cp .env.example .env          # Linux/macOS
# Copy-Item .env.example .env # Windows PowerShell

# 3. Instalar dependências
npm install

# 4. Iniciar servidor de desenvolvimento
npm run dev
```

Acesse em: **http://localhost:3000**

---

## Scripts

| Comando           | Descrição                                      |
| ----------------- | ---------------------------------------------- |
| `npm run dev`     | Servidor local de desenvolvimento (porta 3000) |
| `npm run build`   | Build de produção em `dist/`                   |
| `npm run preview` | Preview local da build de produção             |
| `npm test`        | Testes com Vitest                              |
| `npm run lint`    | Verificação estática com ESLint                |
| `npm run format`  | Formatação com Prettier                        |
