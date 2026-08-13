# Documentação da API REST — TechMotors

**Base URL:** `http://localhost:3000/api`  
**Autenticação:** Bearer Token (JWT) no header `Authorization`

---

## Autenticação (`/api/auth`)

| Método | Rota | Descrição | Auth |
|--------|------|-----------|------|
| POST | `/auth/login` | Login (retorna token + user) | ❌ |
| POST | `/auth/cadastro` | Cadastro de cliente ou oficina | ❌ |
| GET | `/auth/me` | Dados do usuário logado | ✅ |
| GET | `/auth/perfil` | Dados completos do perfil | ✅ |
| PUT | `/auth/perfil` | Atualizar perfil (nome, tel, senha, endereço) | ✅ |
| POST | `/auth/foto` | Upload de foto de perfil (multipart) | ✅ |
| DELETE | `/auth/foto` | Remover foto de perfil | ✅ |
| POST | `/auth/esqueci-senha` | Solicitar link de recuperação | ❌ |
| POST | `/auth/redefinir-senha` | Redefinir senha com token | ❌ |
| GET | `/auth/verificar-token-reset/:token` | Verificar validade do token | ❌ |

---

## Cliente (`/api/cliente`) — Requer auth tipo "cliente"

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/cliente/home` | Dashboard do cliente (categorias + oficinas próximas) |
| GET | `/cliente/busca?q=&categoria=&cidade=&lat=&lng=` | Buscar oficinas com filtros |
| GET | `/cliente/oficina/:id` | Detalhes de uma oficina |
| GET | `/cliente/oficina/:id/avaliacoes` | Todas as avaliações de uma oficina |
| GET | `/cliente/horarios?oficina_id=&data=&duracao=` | Horários disponíveis |
| POST | `/cliente/agendar` | Criar agendamento |
| GET | `/cliente/agendamentos` | Listar agendamentos do cliente |
| POST | `/cliente/cancelar/:id` | Cancelar agendamento |
| GET | `/cliente/veiculos` | Listar veículos |
| POST | `/cliente/veiculos` | Cadastrar veículo |
| DELETE | `/cliente/veiculos/:id` | Remover veículo |
| POST | `/cliente/avaliar` | Avaliar oficina após serviço |
| GET | `/cliente/favoritos` | Listar oficinas favoritas |
| POST | `/cliente/favoritos/:oficina_id` | Favoritar oficina |
| DELETE | `/cliente/favoritos/:oficina_id` | Remover dos favoritos |
| GET | `/cliente/favorito/:oficina_id` | Verificar se está favoritada |
| GET | `/cliente/historico?veiculo_id=` | Histórico de serviços concluídos |
| GET | `/cliente/notificacoes` | Listar notificações |
| POST | `/cliente/notificacoes/ler` | Marcar todas como lidas |
| POST | `/cliente/notificacoes/ler/:id` | Marcar uma como lida |
| GET | `/cliente/comprovante/:id` | Dados do comprovante/recibo |

---

## Oficina (`/api/oficina`) — Requer auth tipo "oficina"

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/oficina/status` | Status de aprovação |
| GET | `/oficina/agenda?inicio=` | Agenda semanal |
| GET | `/oficina/agendamento/:id` | Detalhes de um agendamento |
| GET | `/oficina/solicitacoes?status=` | Listar agendamentos por status |
| POST | `/oficina/solicitacoes/:id/acao` | Confirmar/recusar/concluir/cancelar |
| GET | `/oficina/disponibilidade` | Listar regras de disponibilidade |
| POST | `/oficina/disponibilidade` | Salvar disponibilidade |
| GET | `/oficina/bloqueios` | Listar bloqueios |
| POST | `/oficina/bloqueios` | Criar bloqueio |
| DELETE | `/oficina/bloqueios/:id` | Remover bloqueio |
| GET | `/oficina/servicos` | Listar serviços oferecidos |
| POST | `/oficina/servicos` | Adicionar serviço |
| PUT | `/oficina/servicos/:id` | Atualizar serviço |
| DELETE | `/oficina/servicos/:id` | Remover serviço |
| GET | `/oficina/perfil` | Dados do perfil da oficina |
| PUT | `/oficina/perfil` | Atualizar perfil |
| GET | `/oficina/metricas` | Dashboard + métricas |
| GET | `/oficina/historico` | Histórico de atendimentos |
| GET | `/oficina/notificacoes` | Notificações da oficina |
| POST | `/oficina/notificacoes/ler` | Marcar como lidas |

---

## Admin (`/api/admin`) — Requer auth tipo "admin"

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/admin/dashboard` | Estatísticas gerais |
| GET | `/admin/pendentes` | Oficinas aguardando aprovação |
| POST | `/admin/aprovar/:id` | Aprovar oficina |
| POST | `/admin/rejeitar/:id` | Rejeitar oficina (com motivo) |
| GET | `/admin/oficina/:id` | Detalhes de uma oficina |
| GET | `/admin/usuarios?tipo=&status=` | Listar usuários |
| PUT | `/admin/usuarios/:id/status` | Alterar status do usuário |

---

## Chat (`/api/chat`) — Requer auth (qualquer tipo)

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/chat/conversas` | Listar conversas do usuário |
| POST | `/chat/iniciar` | Iniciar ou retomar conversa com bot |
| POST | `/chat/mensagem` | Enviar mensagem (bot responde automaticamente) |
| GET | `/chat/mensagens/:conversa_id` | Buscar mensagens de uma conversa |
| POST | `/chat/encerrar/:conversa_id` | Encerrar conversa |

---

## Códigos de Status HTTP

| Código | Significado |
|--------|-------------|
| 200 | Sucesso |
| 201 | Criado com sucesso |
| 400 | Dados inválidos / erro de validação |
| 401 | Não autenticado (token ausente/expirado) |
| 403 | Acesso negado (tipo de usuário sem permissão) |
| 404 | Recurso não encontrado |
| 409 | Conflito (ex: horário já ocupado) |
| 500 | Erro interno do servidor |

---

## Exemplo de Requisição

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "joao@email.com",
  "senha": "Senha@123"
}
```

**Resposta:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": 2,
    "nome": "João Silva",
    "email": "joao@email.com",
    "tipo": "cliente",
    "status": "ativo"
  }
}
```
