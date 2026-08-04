# Telas do Sistema — TechMotors

## Guia de Telas para Screenshots

Abaixo estão listadas todas as telas do sistema com instruções de como acessá-las para tirar screenshots.

---

## Telas Públicas (sem login)

| # | Tela | Rota | Descrição |
|---|------|------|-----------|
| 1 | Landing Page | `http://localhost:3000/` | Página inicial com apresentação, botões "Sou Cliente" / "Sou Oficina" |
| 2 | Login | `#login` | Formulário de login com e-mail e senha |
| 3 | Cadastro Cliente | `#cadastro?tipo=cliente` | Formulário com CPF, dados pessoais |
| 4 | Cadastro Oficina | `#cadastro?tipo=oficina` | Formulário com CNPJ, endereço completo |
| 5 | Esqueci Senha | `#esqueci-senha` | Formulário de recuperação por e-mail |
| 6 | Redefinir Senha | `#redefinir-senha?token=XXX` | Nova senha (acesso via link do e-mail) |

---

## Telas do Cliente (login: joao@email.com / Senha@123)

| # | Tela | Rota | Descrição |
|---|------|------|-----------|
| 7 | Home / Dashboard | `#cliente-home` | Hero com busca, categorias, oficinas próximas |
| 8 | Busca de Oficinas | `#cliente-busca` | Filtros + lista de oficinas com cards |
| 9 | Detalhes da Oficina | `#cliente-oficina?id=5` | Info completa, mapa, serviços, avaliações, favoritar |
| 10 | Agendar — Passo 1 | `#cliente-agendar?oficina_id=5&passo=1` | Seleção de serviços |
| 11 | Agendar — Passo 2 | `#cliente-agendar?oficina_id=5&passo=2` | Seleção de data e horário |
| 12 | Agendar — Passo 3 | `#cliente-agendar?oficina_id=5&passo=3` | Seleção de veículo |
| 13 | Agendar — Passo 4 | `#cliente-agendar?oficina_id=5&passo=4` | Confirmação |
| 14 | Meus Agendamentos | `#cliente-agendamentos` | Lista com status, ações (cancelar, avaliar, recibo) |
| 15 | Histórico | `#cliente-historico` | Timeline de serviços concluídos por veículo |
| 16 | Favoritos | `#cliente-favoritos` | Oficinas favoritadas com acesso rápido |
| 17 | Veículos | `#cliente-veiculos` | Lista de veículos, cadastro com validação de placa |
| 18 | Notificações | `#cliente-notificacoes` | Lista de alertas (confirmações, conclusões) |
| 19 | Comprovante | `#cliente-comprovante?id=4` | Recibo do agendamento para impressão |
| 20 | Avaliar | `#cliente-avaliar?id=4` | Formulário de 1-5 estrelas + comentário |
| 21 | Perfil | `#perfil` | Edição de dados, foto, senha |
| 22 | Chat (widget) | Botão flutuante inferior direito | Chatbot + transferência para atendente |

---

## Telas da Oficina (login: jm@oficina.com / Senha@123)

| # | Tela | Rota | Descrição |
|---|------|------|-----------|
| 23 | Agenda Semanal | `#oficina-agenda` | Grade horária com agendamentos clicáveis |
| 24 | Detalhes (modal) | Clicar em slot da agenda | Modal com info do cliente, serviço, veículo, ações |
| 25 | Solicitações | `#oficina-solicitacoes` | Abas por status, confirmar/recusar/concluir |
| 26 | Mensagens | `#oficina-mensagens` | Lista de conversas + painel de chat |
| 27 | Disponibilidade | `#oficina-disponibilidade` | Configuração de horários por dia da semana |
| 28 | Bloqueios | `#oficina-bloqueios` | Criação de períodos bloqueados |
| 29 | Serviços | `#oficina-servicos` | CRUD de serviços com preço e duração |
| 30 | Métricas/Painel | `#oficina-metricas` | Dashboard + agenda do dia + histórico |
| 31 | Notificações | `#oficina-notificacoes` | Alertas de novos agendamentos e cancelamentos |

---

## Telas do Admin (login: admin@techmotors.com / Senha@123)

| # | Tela | Rota | Descrição |
|---|------|------|-----------|
| 32 | Dashboard | `#admin-dashboard` | Estatísticas completas: contadores, taxa de conclusão, receita, agendamentos por mês, top oficinas |
| 33 | Aprovações | `#admin-pendentes` | Oficinas aguardando, aprovar/rejeitar |
| 34 | Usuários | `#admin-usuarios` | Lista com busca por nome/e-mail, filtro por tipo/status, clique para detalhes |
| 35 | Detalhe do Usuário | `#admin-usuario?id=2` | Tudo sobre o usuário: dados, veículos, agendamentos, avaliações |
| 36 | Catálogo de Serviços | `#admin-catalogo` | CRUD de serviços globais organizados por categoria |
| 37 | Ranking | `#admin-ranking` | Ranking de oficinas por nota e por volume de agendamentos |
| 38 | Moderação de Avaliações | `#admin-avaliacoes` | Ver todas as avaliações, ocultar/restaurar as ofensivas |

---

## Funcionalidades Transversais

| Funcionalidade | Como demonstrar |
|----------------|-----------------|
| Tema Escuro | Dropdown do perfil → botão lua 🌙 |
| Tema Claro | Dropdown do perfil → botão sol ☀️ |
| Responsividade | Reduzir janela do navegador ou F12 → dispositivo móvel |
| Geolocalização | Permitir localização quando solicitado na home |
| Impressão de recibo | Tela de comprovante → botão "Imprimir" |

---

## Dica para Screenshots

1. Abra o DevTools (F12) → aba "Device" → escolha "iPhone 12 Pro" para mobile
2. Para tema escuro, ative antes de tirar os prints
3. Use a extensão "Full Page Screenshot" do Chrome para páginas longas
4. Recomendado: 2-3 screenshots de cada perfil mostrando funcionalidades-chave
