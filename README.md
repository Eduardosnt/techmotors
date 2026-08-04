# TechMotors — Plataforma de Agendamentos Automotivos

Sistema web completo para agendamento de serviços automotivos, conectando clientes a oficinas mecânicas.

## Stack Tecnológica

| Camada | Tecnologia |
|--------|-----------|
| Backend | Node.js + Express + TypeScript |
| Banco de Dados | SQLite (better-sqlite3) |
| Frontend | HTML5 + CSS3 + JavaScript (SPA) |
| Autenticação | JWT + bcrypt |
| UI | Bootstrap 5 + Bootstrap Icons |
| E-mail | Nodemailer (Gmail SMTP) |
| Upload | Multer |

## Funcionalidades

### Cliente
- Busca de oficinas por serviço, categoria e geolocalização
- Agendamento em 4 passos (serviço → data/hora → veículo → confirmação)
- Histórico de serviços por veículo
- Favoritar oficinas
- Avaliações (1-5 estrelas + comentário)
- Notificações em tempo real
- Comprovante/recibo para impressão
- Chat com bot + atendente da oficina
- Gerenciamento de veículos (placa antiga e Mercosul)
- Tema claro/escuro/sistema

### Oficina
- Agenda semanal visual com detalhes ao clicar
- Confirmar/recusar/concluir agendamentos
- Configuração de disponibilidade e bloqueios
- Gerenciamento de serviços e preços
- Painel de métricas (dashboard + receita + histórico)
- Chat com clientes
- Notificações de novos agendamentos

### Administrador
- Dashboard com estatísticas completas
- Aprovação/rejeição de oficinas
- Gestão de usuários (busca, filtros, detalhes, bloquear)
- Catálogo global de serviços
- Ranking de oficinas (por nota e volume)
- Moderação de avaliações
- Notificações

### Segurança
- Rate limiting (login, cadastro, recuperação de senha)
- Headers HTTP de segurança (CSP, X-Frame-Options, etc.)
- Sanitização de inputs contra XSS
- Prepared statements contra SQL injection
- Política de senha forte
- Recuperação de senha por e-mail com token temporário
- Upload com validação de tipo e tamanho

## Como Rodar

### Pré-requisitos
- Node.js 18+

### Instalação

```bash
cd backend
npm install
```

### Configuração (opcional)

Copie `.env.example` para `.env` e preencha:
```bash
cp .env.example .env
```

### Iniciar

```bash
cd backend
npm run dev
```

Acesse **http://localhost:3000**

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
├── backend/
│   ├── src/
│   │   ├── server.ts            Servidor + middlewares de segurança
│   │   ├── config/database.ts   SQLite + schema + seed
│   │   ├── middleware/auth.ts   JWT + controle de acesso
│   │   └── routes/
│   │       ├── auth.ts          Login, cadastro, perfil, foto, reset senha
│   │       ├── cliente.ts       Busca, agendamento, veículos, favoritos, histórico
│   │       ├── oficina.ts       Agenda, solicitações, métricas, notificações
│   │       ├── admin.ts         Dashboard, aprovações, catálogo, ranking, moderação
│   │       └── chat.ts          Chatbot + mensagens cliente↔oficina
│   ├── data/                    Banco SQLite (auto-gerado)
│   ├── .env.example             Variáveis de ambiente
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── index.html               SPA (Single Page Application)
│   ├── css/style.css            Design system + tema escuro
│   ├── uploads/                 Fotos de perfil
│   └── js/
│       ├── api.js               HTTP helper + utilitários
│       ├── app.js               Router + navbar + tema
│       ├── chat-widget.js       Widget de chat flutuante
│       ├── pages-auth.js        Login, cadastro, perfil, recuperação
│       ├── pages-cliente.js     Todas as telas do cliente
│       ├── pages-oficina.js     Todas as telas da oficina
│       └── pages-admin.js       Todas as telas do admin
├── docs/
│   ├── 01-DER-banco-de-dados.md
│   ├── 02-casos-de-uso.md
│   ├── 03-documentacao-api.md
│   ├── 04-telas-do-sistema.md
│   ├── 05-justificativa-problema.md
│   └── 06-seguranca.md
└── README.md
```

## Documentação

A pasta `docs/` contém documentação completa para o TCC:
- **DER** — Diagrama de banco com 12 tabelas e relacionamentos
- **Casos de Uso** — 39 casos de uso por ator
- **API REST** — Todas as rotas documentadas
- **Telas** — Guia de 38 telas com credenciais
- **Justificativa** — Problema, solução, objetivos, metodologia
- **Segurança** — Mecanismos implementados e conformidade LGPD

## Autores

Eduardo Santos Morais / Thiago Régis Vieira Rocha — UDF — Sistemas de Informação
