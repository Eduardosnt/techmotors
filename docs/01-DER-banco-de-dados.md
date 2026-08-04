# Diagrama Entidade-Relacionamento (DER) — TechMotors

## Modelo Relacional

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                            DIAGRAMA DE TABELAS                                   │
└─────────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────┐       ┌──────────────────────┐
│      USUARIOS        │       │       CLIENTES       │
├──────────────────────┤       ├──────────────────────┤
│ *id (PK)             │──1:1──│ *usuario_id (PK, FK) │
│  nome                │       │  cpf (UNIQUE)        │
│  email (UNIQUE)      │       └──────────────────────┘
│  senha               │
│  telefone            │       ┌──────────────────────────────┐
│  tipo                │       │         OFICINAS             │
│  status              │──1:1──├──────────────────────────────┤
│  foto_url            │       │ *usuario_id (PK, FK)         │
│  criado_em           │       │  cnpj (UNIQUE)               │
│  atualizado_em       │       │  nome_fantasia               │
└──────────────────────┘       │  razao_social                │
                               │  logradouro, numero, bairro  │
                               │  cidade, uf, cep             │
                               │  latitude, longitude         │
                               │  nota_media                  │
                               │  total_avaliacoes            │
                               │  status_aprovacao            │
                               │  motivo_rejeicao             │
                               │  aprovado_por (FK)           │
                               │  aprovado_em                 │
                               └──────────────────────────────┘

┌──────────────────────┐       ┌──────────────────────────────┐
│      VEICULOS        │       │     CATALOGO_SERVICOS        │
├──────────────────────┤       ├──────────────────────────────┤
│ *id (PK)             │       │ *id (PK)                     │
│  cliente_id (FK)     │       │  nome                        │
│  placa (UNIQUE)      │       │  categoria                   │
│  marca               │       │  descricao                   │
│  modelo              │       │  ativo                       │
│  ano                 │       └──────────────────────────────┘
│  tipo                │
└──────────────────────┘

┌───────────────────────────────┐       ┌──────────────────────────────┐
│      OFICINA_SERVICOS         │       │       DISPONIBILIDADE        │
├───────────────────────────────┤       ├──────────────────────────────┤
│ *id (PK)                      │       │ *id (PK)                     │
│  oficina_id (FK)              │       │  oficina_id (FK)             │
│  servico_id (FK)              │       │  dia_semana                  │
│  preco_modalidade             │       │  hora_inicio                 │
│  preco                        │       │  hora_fim                    │
│  duracao_minutos              │       │  ativo                       │
│  ativo                        │       └──────────────────────────────┘
│  UNIQUE(oficina_id,servico_id)│
└───────────────────────────────┘       ┌──────────────────────────────┐
                                        │         BLOQUEIOS            │
                                        ├──────────────────────────────┤
                                        │ *id (PK)                     │
                                        │  oficina_id (FK)             │
                                        │  data_inicio                 │
                                        │  data_fim                    │
                                        │  motivo                      │
                                        └──────────────────────────────┘

┌───────────────────────────────────────────────────────────────┐
│                       AGENDAMENTOS                             │
├───────────────────────────────────────────────────────────────┤
│ *id (PK)                                                      │
│  cliente_id (FK → clientes.usuario_id)                        │
│  oficina_id (FK → oficinas.usuario_id)                        │
│  veiculo_id (FK → veiculos.id)                                │
│  servico_id (FK → catalogo_servicos.id)                       │
│  data_hora                                                    │
│  duracao_minutos                                              │
│  status (solicitado|confirmado|concluido|cancelado|recusado)  │
│  motivo_cancelamento                                          │
│  valor_estimado                                               │
│  criado_em, atualizado_em                                     │
│  UNIQUE(oficina_id, data_hora)                                │
└───────────────────────────────────────────────────────────────┘

┌──────────────────────────────┐       ┌──────────────────────────────┐
│        AVALIACOES            │       │        FAVORITOS             │
├──────────────────────────────┤       ├──────────────────────────────┤
│ *id (PK)                     │       │ *id (PK)                     │
│  agendamento_id (FK, UNIQUE) │       │  cliente_id (FK)             │
│  cliente_id (FK)             │       │  oficina_id (FK)             │
│  oficina_id (FK)             │       │  criado_em                   │
│  qtd_estrelas (1-5)          │       │  UNIQUE(cliente_id,oficina_id)│
│  comentario                  │       └──────────────────────────────┘
│  ocultada                    │
│  criado_em                   │
└──────────────────────────────┘

┌──────────────────────────────┐       ┌──────────────────────────────┐
│       NOTIFICACOES           │       │         CONVERSAS            │
├──────────────────────────────┤       ├──────────────────────────────┤
│ *id (PK)                     │       │ *id (PK)                     │
│  usuario_id (FK)             │       │  cliente_id (FK)             │
│  tipo                        │       │  oficina_id (FK)             │
│  titulo                      │       │  status (bot|atendente|enc.) │
│  mensagem                    │       │  criado_em                   │
│  lida                        │       │  atualizado_em               │
│  link                        │       └──────────────────────────────┘
│  criado_em                   │
└──────────────────────────────┘       ┌──────────────────────────────┐
                                       │         MENSAGENS            │
                                       ├──────────────────────────────┤
                                       │ *id (PK)                     │
                                       │  conversa_id (FK)            │
                                       │  remetente (cliente|bot|ofi) │
                                       │  conteudo                    │
                                       │  criado_em                   │
                                       └──────────────────────────────┘
```

## Relacionamentos

| Origem | Destino | Tipo | Descrição |
|--------|---------|------|-----------|
| usuarios | clientes | 1:1 | Cada cliente é um usuário |
| usuarios | oficinas | 1:1 | Cada oficina é um usuário |
| clientes | veiculos | 1:N | Um cliente tem vários veículos |
| oficinas | oficina_servicos | 1:N | Uma oficina oferece vários serviços |
| catalogo_servicos | oficina_servicos | 1:N | Um serviço pode ser oferecido por várias oficinas |
| oficinas | disponibilidade | 1:N | Uma oficina tem vários horários |
| oficinas | bloqueios | 1:N | Uma oficina pode ter vários bloqueios |
| clientes | agendamentos | 1:N | Um cliente faz vários agendamentos |
| oficinas | agendamentos | 1:N | Uma oficina recebe vários agendamentos |
| veiculos | agendamentos | 1:N | Um veículo pode ter vários agendamentos |
| agendamentos | avaliacoes | 1:1 | Cada agendamento tem no máximo 1 avaliação |
| clientes | favoritos | 1:N | Um cliente pode favoritar várias oficinas |
| usuarios | notificacoes | 1:N | Um usuário recebe várias notificações |
| clientes | conversas | 1:N | Um cliente pode ter várias conversas |
| conversas | mensagens | 1:N | Uma conversa tem várias mensagens |

## Regras de Negócio Implementadas no Banco

1. **Unicidade de horário**: `UNIQUE(oficina_id, data_hora)` — impede agendamentos duplicados no mesmo slot
2. **Uma avaliação por agendamento**: `agendamento_id UNIQUE` em avaliacoes
3. **Favorito único**: `UNIQUE(cliente_id, oficina_id)` — impede favoritar a mesma oficina duas vezes
4. **Status controlado**: CHECK constraints garantem valores válidos
5. **Cascata**: DELETE CASCADE em veículos, mensagens — mantém integridade
6. **Placa única**: veículos não podem ter placa duplicada no sistema
