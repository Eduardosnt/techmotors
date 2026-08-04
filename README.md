# TechMotors — Plataforma de Agendamentos Automotivos (Node.js + TypeScript)

Versão moderna do TechMotors com backend em **Node.js + TypeScript + Express** e frontend em **HTML + CSS + JavaScript**.

## Stack

- **Backend**: Node.js + Express + TypeScript
- **Banco de Dados**: MySQL 5.7+
- **Frontend**: HTML5 + CSS3 + JavaScript (SPA com hash routing)
- **Autenticação**: JWT (JSON Web Token)
- **UI**: Bootstrap 5 + Bootstrap Icons

## Como Rodar

### Pré-requisitos
- Node.js 18+ instalado
- MySQL rodando (XAMPP ou standalone)
- Banco `techmotors` criado com o schema.sql

### 1. Criar o banco de dados

Importe o schema no MySQL:
```bash
mysql -u root -p < database/schema.sql
```
Ou via phpMyAdmin: Importar → `database/schema.sql`

### 2. Instalar dependências do backend

```bash
cd backend
npm install
```

### 3. Ajustar senhas dos usuários teste

```bash
cd backend
npm run setup
```

### 4. Iniciar o servidor

```bash
cd backend
npm run dev
```

O servidor inicia em **http://localhost:3000**

### 5. Acessar o site

Abra http://localhost:3000 no navegador.

## Contas de Teste

| Tipo | E-mail | Senha |
|------|--------|-------|
| Admin | admin@techmotors.com | Senha@123 |
| Cliente | joao@email.com | Senha@123 |
| Cliente | maria@email.com | Senha@123 |
| Oficina (aprovada) | jm@oficina.com | Senha@123 |
| Oficina (aprovada) | high@oficina.com | Senha@123 |
| Oficina (pendente) | autocenter@oficina.com | Senha@123 |

## Estrutura do Projeto

```
techmotors/
├── backend/                 API REST Node.js + TypeScript
│   ├── src/
│   │   ├── server.ts       Entry point do servidor
│   │   ├── config/
│   │   │   └── database.ts Conexão MySQL (pool)
│   │   ├── middleware/
│   │   │   └── auth.ts     JWT + controle de acesso
│   │   ├── routes/
│   │   │   ├── auth.ts     Login, cadastro, validações
│   │   │   ├── cliente.ts  Busca, agendamento, veículos, avaliações
│   │   │   ├── oficina.ts  Agenda, solicitações, serviços, métricas
│   │   │   └── admin.ts    Dashboard, aprovações, gestão de usuários
│   │   └── setup.ts        Script de reset de senhas
│   ├── package.json
│   └── tsconfig.json
├── frontend/                SPA (Single Page Application)
│   ├── index.html          HTML único (SPA)
│   ├── css/
│   │   └── style.css       Estilos customizados
│   └── js/
│       ├── api.js          Helper HTTP + formatação + utilitários
│       ├── app.js          Router (hash-based) + navbar
│       ├── pages-auth.js   Login + Cadastro
│       ├── pages-cliente.js Telas do cliente
│       ├── pages-oficina.js Telas da oficina
│       └── pages-admin.js  Telas do admin
├── database/
│   └── schema.sql          DDL + dados de teste (MySQL)
└── config/
    └── db.php              (legado PHP — pode ignorar)
```

## API REST - Endpoints

### Autenticação
- `POST /api/auth/login` — Login (retorna JWT)
- `POST /api/auth/cadastro` — Cadastro de cliente ou oficina
- `GET /api/auth/me` — Dados do usuário logado

### Cliente (requer token + tipo=cliente)
- `GET /api/cliente/home` — Categorias + oficinas destaques
- `GET /api/cliente/busca?q=&categoria=&cidade=` — Buscar oficinas
- `GET /api/cliente/oficina/:id` — Detalhes da oficina
- `GET /api/cliente/horarios?oficina_id=&data=&duracao=` — Slots disponíveis
- `POST /api/cliente/agendar` — Criar agendamento
- `GET /api/cliente/agendamentos` — Listar agendamentos
- `POST /api/cliente/cancelar/:id` — Cancelar agendamento
- `GET /api/cliente/veiculos` — Listar veículos
- `POST /api/cliente/veiculos` — Cadastrar veículo
- `DELETE /api/cliente/veiculos/:id` — Remover veículo
- `POST /api/cliente/avaliar` — Avaliar serviço concluído

### Oficina (requer token + tipo=oficina)
- `GET /api/oficina/status` — Status da aprovação
- `GET /api/oficina/perfil` — Dados do perfil
- `PUT /api/oficina/perfil` — Atualizar perfil
- `GET /api/oficina/agenda?inicio=` — Agenda semanal
- `GET /api/oficina/solicitacoes?status=` — Agendamentos por status
- `POST /api/oficina/solicitacoes/:id/acao` — Confirmar/recusar/concluir
- `GET /api/oficina/disponibilidade` — Horários semanais
- `PUT /api/oficina/disponibilidade` — Salvar disponibilidade
- `GET /api/oficina/bloqueios` — Listar bloqueios
- `POST /api/oficina/bloqueios` — Criar bloqueio
- `DELETE /api/oficina/bloqueios/:id` — Remover bloqueio
- `GET /api/oficina/servicos` — Serviços oferecidos + catálogo
- `POST /api/oficina/servicos` — Adicionar serviço
- `DELETE /api/oficina/servicos/:id` — Remover serviço
- `GET /api/oficina/metricas` — Indicadores e métricas

### Admin (requer token + tipo=admin)
- `GET /api/admin/dashboard` — Indicadores gerais
- `GET /api/admin/pendentes` — Oficinas aguardando aprovação
- `GET /api/admin/oficina/:id` — Detalhes da oficina
- `POST /api/admin/aprovar/:id` — Aprovar oficina
- `POST /api/admin/rejeitar/:id` — Rejeitar oficina
- `GET /api/admin/usuarios?tipo=` — Listar usuários
- `PUT /api/admin/usuarios/:id/status` — Alterar status

## Configuração de Banco

Edite `backend/src/config/database.ts` se precisar alterar:
- Host (padrão: localhost)
- Usuário (padrão: root)
- Senha (padrão: vazia)
- Nome do banco (padrão: techmotors)

## Autores

Eduardo Santos Morais / Thiago Régis Vieira Rocha — UDF — Sistemas de Informação
