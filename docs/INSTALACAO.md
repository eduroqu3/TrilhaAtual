# Guia de Instalação e Execução — Trilha

Este documento orienta a instalação do zero, configuração do banco de dados (PostgreSQL/Supabase) e execução completa do sistema **Trilha** (Backend Django + Frontend TanStack Start/React).

---

## 1. Visão Geral da Arquitetura

O sistema é dividido em duas partes integradas:

- **Backend (`/backend`)**: API RESTful desenvolvida com Django 5 e Django REST Framework. Utiliza SimpleJWT com tokens em cookies HttpOnly (`SameSite=Lax`, `Secure` em produção), isolamento por escola e anonimato garantido por arquitetura nas avaliações.
- **Frontend (`/`)**: Interface moderna em React 19 com TanStack Start, TanStack Router e Tailwind CSS v4, consumindo a API Django em `localhost:8000`.

---

## 2. Pré-requisitos

Antes de iniciar, certifique-se de ter instalado em sua máquina:

- **Python**: versão 3.12 ou superior.
- **Node.js**: versão 20 ou superior (com `npm`).
- **Git**.

---

## 3. Configuração do Banco de Dados no Supabase

O Trilha conecta-se ao PostgreSQL exclusivamente através da API do Django via connection string (`DATABASE_URL`). O Supabase é utilizado apenas como provedor de banco de dados relacional.

> [!IMPORTANT]
> **Nunca utilize as chaves `anon` ou `service_role` no frontend ou no backend.** Todo o tráfego do sistema passa pelo Django.

### 3.1. Obter a Connection String do Supabase

1. Acesse o [Supabase Dashboard](https://supabase.com/dashboard) e selecione o seu projeto.
2. No menu lateral, vá em **Project Settings** (ícone de engrenagem) ➔ **Database**.
3. Na seção **Connection string**, selecione o modo **URI**.
4. Escolha a aba **Session pooler** (Porta `5432`) ou **Direct connection** (Porta `5432` com IPv6). Para conexões locais padrão, a porta recomendada para Django é `5432` no Session Pooler.
5. Copie a URI. O formato será semelhante a:
   ```text
   postgresql://postgres.[SEU-PROJECT-REF]:[SUA-SENHA]@aws-0-[REGIAO].pooler.supabase.com:5432/postgres?sslmode=require
   ```
6. Substitua `[SUA-SENHA]` pela senha definida na criação do projeto.

### 3.2. Endurecimento do Banco (Desativar Data API e Proteger Tabelas)

Como o Supabase expõe a PostgREST Data API por padrão na porta pública (usando a role `anon`), é uma boa prática de segurança garantir que ninguém acesse os dados diretamente pelo navegador.

Acesse o **SQL Editor** no painel do Supabase e execute o seguinte script:

```sql
-- 1. Revoga acesso público da API PostgREST (anon e authenticated) no schema público
REVOKE ALL ON SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL ROUTINES IN SCHEMA public FROM anon, authenticated;

-- 2. Garante que futuras tabelas criadas pelo Django não sejam expostas para anon
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON ROUTINES FROM anon, authenticated;

-- 3. Habilita Row Level Security (RLS) nas tabelas sensíveis de avaliação
ALTER TABLE IF EXISTS avaliacoes_avaliacao ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS avaliacoes_participacao ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS avaliacoes_respostaescala ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS avaliacoes_respostatexto ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS relatorios_resumovinculo ENABLE ROW LEVEL SECURITY;
```

---

## 4. Instalação e Execução do Backend

Abra um terminal e acerte o diretório `backend/`:

### 4.1. Criar o Ambiente Virtual

**No Windows (PowerShell):**
```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

**No Linux/macOS:**
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
```

### 4.2. Instalar as Dependências

```bash
pip install --upgrade pip
pip install -r requirements.txt
```

### 4.3. Configurar as Variáveis de Ambiente

Crie o arquivo `backend/.env` baseado no exemplo `backend/.env.example`:

```ini
DEBUG=True
SECRET_KEY=sua-chave-secreta-de-desenvolvimento-muito-segura-1234
ALLOWED_HOSTS=localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=http://localhost:3000
CSRF_TRUSTED_ORIGINS=http://localhost:3000

# Connection string obtida no Supabase (Session pooler na porta 5432 com sslmode=require)
DATABASE_URL=postgresql://postgres.seu-ref:sua-senha@aws-0-sa-east-1.pooler.supabase.com:5432/postgres?sslmode=require
```

*(Observação: Caso não configure `DATABASE_URL`, o sistema usará SQLite local automaticamente para desenvolvimento e testes).*

### 4.4. Aplicar as Migrações do Banco

Com a connection string configurada:

```bash
python manage.py migrate
```

### 4.5. Popular com Dados de Demonstração (seed_demo)

Para carregar turmas, disciplinas, coordenadores, professores, alunos e um ciclo aberto com avaliações para testes:

```bash
python manage.py seed_demo
```

### 4.6. Iniciar o Servidor Django

```bash
python manage.py runserver 8000
```
O backend estará disponível em `http://localhost:8000`.

---

## 5. Instalação e Execução do Frontend

Em outro terminal, na raiz do repositório:

### 5.1. Instalar Dependências do Node

```bash
npm install
```

### 5.2. Iniciar o Servidor de Desenvolvimento

```bash
npm run dev
```
O frontend estará acessível em `http://localhost:3000`.

---

## 6. Como Rodar os Testes

### 6.1. Testes do Backend (pytest e ruff)

No diretório `backend/` com o ambiente virtual ativo:

```bash
# Rodar todos os testes automatizados (unitários, anonimato e E2E)
python -m pytest

# Verificar conformidade de código e formatação
python -m ruff check .
```

### 6.2. Testes do Frontend (vitest e build)

Na raiz do repositório:

```bash
# Rodar suíte de testes com vitest
npm test

# Testar compilação do cliente e SSR
npm run build
```

---

## 7. Credenciais de Demonstração (seed_demo)

Todas as contas criadas pelo `seed_demo` possuem a senha: **`demo1234`**

| Papel | Usuário | O que faz no sistema |
|---|---|---|
| **Coordenação** | `coord.demo` | Gerencia ciclos (abrir/fechar/publicar), perguntas, acompanha adesão e modera comentários |
| **Estudante** | `aluno6.demo` | Acessa pendências, responde ao questionário com garantia de anonimato |
| **Professor** | `prof.matematica` | Visualiza médias por dimensão e comentários pedagógicos de turmas que atingiram o limiar |
| **Professor** | `prof.historia` | Disciplina com dados insuficientes (mostra mensagem acolhedora sem notas) |
| **Admin** | `admin.demo` | Acesso administrativo global |

---

## 8. Problemas Comuns e Soluções

- **Erro `IsADirectoryError` ou `ConnectionRefusedError` na conexão com o banco:**
  Verifique se o seu IP está liberado na seção *Network Restrictions* do Supabase ou adicione `0.0.0.0/0` se estiver em rede móvel. Certifique-se de que a porta é `5432` e o parâmetro `?sslmode=require` está na URL.
- **Erro de CORS ao tentar logar:**
  Verifique se o backend está rodando na porta `8000` e o frontend na porta `3000`. As variáveis `CORS_ALLOWED_ORIGINS` e `CSRF_TRUSTED_ORIGINS` no `backend/.env` devem incluir `http://localhost:3000`.
- **Erro 409 ao responder avaliação:**
  O sistema garante por arquitetura que cada estudante responde apenas uma vez por disciplina em cada ciclo. Use outro aluno do `seed_demo` (`aluno7.demo`).
