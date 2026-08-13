# Contribuindo com o TechMotors

Guia para configurar o ambiente local e contribuir com o projeto.

## Pré-requisitos

- **Node.js** 18+ ([download](https://nodejs.org))
- **Git** ([download](https://git-scm.com))
- Editor com suporte a EditorConfig (VS Code, IntelliJ, etc.)

## Setup do ambiente local

### 1. Clonar o repositório

```bash
git clone <url-do-repositorio>
cd techmotors
```

### 2. Instalar dependências

```bash
cd backend
npm install
```

### 3. Configurar variáveis de ambiente

```bash
cp .env.example .env
```

Edite o `.env` e preencha **obrigatoriamente**:

| Variável | Descrição | Obrigatória |
|----------|-----------|:-----------:|
| `JWT_SECRET` | Chave secreta para tokens JWT. Use uma string longa e aleatória. | ✅ |
| `PORT` | Porta do servidor (padrão: 3000) | Não |
| `EMAIL_USER` | E-mail Gmail para recuperação de senha | Não* |
| `EMAIL_PASS` | Senha de app do Gmail | Não* |
| `CORS_ORIGIN` | Origens permitidas (`*` para dev) | Não |

> *Necessário apenas se quiser testar o fluxo de recuperação de senha.

⚠️ O servidor **não inicia** sem `JWT_SECRET`. Isso é intencional para evitar chaves hardcoded em produção.

### 4. Instalar git hooks

```bash
npx lefthook install
```

Isso configura o hook `pre-commit` que roda lint, format check e typecheck automaticamente.

### 5. Iniciar o servidor

```bash
npm run dev
```

O servidor sobe em `http://localhost:3000` com hot-reload via ts-node.

### 6. Verificar que está funcionando

Abra `http://localhost:3000` no navegador. Faça login com:
- **Admin:** admin@techmotors.com / Senha@123
- **Cliente:** joao@email.com / Senha@123
- **Oficina:** jm@oficina.com / Senha@123

## Banco de dados

O SQLite é criado automaticamente em `backend/data/techmotors.db` na primeira execução, com schema e dados de teste (seed).

Para resetar o banco, basta deletar o arquivo `.db` e reiniciar o servidor:

```bash
rm backend/data/techmotors.db*
npm run dev
```

## Ferramentas de qualidade

### ESLint (lint)

```bash
npm run lint        # relatório de problemas
npm run lint:fix    # corrige automaticamente o que puder
```

### Prettier (formatação)

```bash
npm run format        # formata todos os arquivos
npm run format:check  # verifica sem alterar (usado no CI)
```

### TypeScript (typecheck)

```bash
npm run build   # compila e verifica tipos
```

## Fluxo de contribuição

1. Crie uma branch a partir de `main`:
   ```bash
   git checkout -b feat/minha-feature
   ```

2. Faça as alterações no código.

3. Ao commitar, o Lefthook roda automaticamente:
   - ESLint (erros bloqueiam o commit)
   - Prettier check (formatação inconsistente bloqueia)
   - tsc (erros de tipo bloqueiam)

4. Se o commit falhar, corrija com:
   ```bash
   npm run lint:fix
   npm run format
   ```

5. Envie a branch e abra um Pull Request.

## Estrutura de pastas

```
backend/src/
├── server.ts              # Entry point, middlewares globais
├── config/
│   └── database.ts        # Conexão SQLite, schema, seed
├── middleware/
│   └── auth.ts            # JWT, autenticação, autorização
└── routes/
    ├── auth.ts            # Cadastro, login, perfil, reset senha
    ├── cliente.ts         # Rotas exclusivas do cliente
    ├── oficina.ts         # Rotas exclusivas da oficina
    ├── admin.ts           # Painel administrativo
    └── chat.ts            # Chatbot e mensagens
```

## Convenções

- **Commits:** mensagens em português, formato livre (não usamos conventional commits por enquanto)
- **Branches:** `feat/`, `fix/`, `chore/`
- **Variáveis/funções:** camelCase
- **Tabelas/colunas:** snake_case
- **Imports:** organizados por grupo (builtin → external → internal)

## Problemas comuns

| Problema | Solução |
|----------|---------|
| `JWT_SECRET não definido` | Crie o `.env` com a variável preenchida |
| `EADDRINUSE :3000` | Outra instância rodando. Mate o processo ou mude a PORT |
| `database is locked` | Feche conexões abertas (ex: DB Browser) |
| Lefthook não roda | Execute `npx lefthook install` na raiz |
