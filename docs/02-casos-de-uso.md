# Diagrama de Casos de Uso — TechMotors

## Atores

| Ator | Descrição |
|------|-----------|
| **Cliente** | Pessoa física que busca e agenda serviços automotivos |
| **Oficina** | Pessoa jurídica que oferece serviços mecânicos |
| **Administrador** | Gerencia a plataforma, aprova oficinas |
| **Sistema (Bot)** | Assistente virtual automatizado |

## Casos de Uso por Ator

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         SISTEMA TECHMOTORS                                │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────┐     │
│  │                        CLIENTE                                   │     │
│  │                                                                  │     │
│  │  • UC01 - Cadastrar-se como cliente                             │     │
│  │  • UC02 - Fazer login / logout                                  │     │
│  │  • UC03 - Recuperar senha por e-mail                            │     │
│  │  • UC04 - Editar perfil e foto                                  │     │
│  │  • UC05 - Cadastrar/remover veículos                            │     │
│  │  • UC06 - Buscar oficinas (por serviço, categoria, localização) │     │
│  │  • UC07 - Visualizar detalhes da oficina                        │     │
│  │  • UC08 - Agendar serviço (wizard 4 etapas)                    │     │
│  │  • UC09 - Cancelar agendamento                                  │     │
│  │  • UC10 - Visualizar agendamentos                               │     │
│  │  • UC11 - Avaliar oficina (1-5 estrelas + comentário)           │     │
│  │  • UC12 - Favoritar/desfavoritar oficinas                       │     │
│  │  • UC13 - Consultar histórico de serviços                      │     │
│  │  • UC14 - Gerar comprovante/recibo                              │     │
│  │  • UC15 - Receber notificações                                  │     │
│  │  • UC16 - Conversar com chatbot                                 │     │
│  │  • UC17 - Solicitar atendente (chat com oficina)                │     │
│  │  • UC18 - Alternar tema (claro/escuro/sistema)                  │     │
│  │  • UC19 - Ver localização da oficina no mapa                    │     │
│  │  • UC20 - Ver todas as avaliações de uma oficina                │     │
│  └─────────────────────────────────────────────────────────────────┘     │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────┐     │
│  │                        OFICINA                                   │     │
│  │                                                                  │     │
│  │  • UC21 - Cadastrar-se como oficina                             │     │
│  │  • UC22 - Fazer login / logout                                  │     │
│  │  • UC23 - Editar perfil, endereço e coordenadas                 │     │
│  │  • UC24 - Gerenciar serviços oferecidos (preço, duração)        │     │
│  │  • UC25 - Configurar disponibilidade semanal                    │     │
│  │  • UC26 - Criar/remover bloqueios de agenda                     │     │
│  │  • UC27 - Visualizar agenda semanal                             │     │
│  │  • UC28 - Ver detalhes de agendamento na agenda                 │     │
│  │  • UC29 - Confirmar/recusar solicitações                        │     │
│  │  • UC30 - Marcar serviço como concluído                         │     │
│  │  • UC31 - Cancelar agendamento confirmado                       │     │
│  │  • UC32 - Visualizar painel de métricas                         │     │
│  │  • UC33 - Consultar histórico de atendimentos                   │     │
│  │  • UC34 - Responder mensagens de clientes                       │     │
│  │  • UC35 - Receber notificações                                  │     │
│  └─────────────────────────────────────────────────────────────────┘     │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────┐     │
│  │                      ADMINISTRADOR                               │     │
│  │                                                                  │     │
│  │  • UC36 - Visualizar dashboard geral                            │     │
│  │  • UC37 - Aprovar/rejeitar cadastro de oficinas                 │     │
│  │  • UC38 - Gerenciar usuários (bloquear, ativar)                 │     │
│  │  • UC39 - Visualizar detalhes de oficinas                       │     │
│  └─────────────────────────────────────────────────────────────────┘     │
│                                                                           │
└─────────────────────────────────────────────────────────────────────────┘
```

## Detalhamento dos Principais Casos de Uso

### UC08 — Agendar Serviço

| Campo | Descrição |
|-------|-----------|
| **Ator** | Cliente |
| **Pré-condição** | Estar logado, ter ao menos 1 veículo cadastrado |
| **Fluxo Principal** | 1. Cliente acessa oficina → clica "Agendar" |
| | 2. Seleciona um ou mais serviços |
| | 3. Escolhe data e horário disponível |
| | 4. Seleciona o veículo |
| | 5. Confirma a solicitação |
| **Pós-condição** | Agendamento criado com status "solicitado"; oficina notificada |
| **Fluxo Alternativo** | Sem horários → mostra mensagem; Sem veículos → redireciona pra cadastro |

### UC29 — Confirmar/Recusar Solicitação

| Campo | Descrição |
|-------|-----------|
| **Ator** | Oficina |
| **Pré-condição** | Existir agendamento com status "solicitado" |
| **Fluxo Principal** | 1. Oficina acessa solicitações pendentes |
| | 2. Clica no agendamento → vê detalhes |
| | 3. Clica "Confirmar" ou "Recusar" (com motivo) |
| **Pós-condição** | Status atualizado; cliente recebe notificação |

### UC16/UC17 — Chatbot + Atendente

| Campo | Descrição |
|-------|-----------|
| **Ator** | Cliente, Bot, Oficina |
| **Fluxo** | 1. Cliente abre chat → bot responde automaticamente |
| | 2. Cliente digita "atendente" → bot lista oficinas |
| | 3. Cliente escolhe oficina → conversa transferida |
| | 4. Oficina vê conversa na aba "Mensagens" e responde |
