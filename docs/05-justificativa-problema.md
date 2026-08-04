# Justificativa e Problema — TechMotors

## 1. Contextualização

O setor de serviços automotivos no Brasil é composto majoritariamente por micro e pequenas empresas. Segundo dados do Sebrae (2023), existem mais de 120 mil oficinas mecânicas no país, sendo que a grande maioria opera de forma informal, sem sistemas digitais de gestão ou canais de comunicação estruturados com seus clientes.

Paralelamente, os consumidores estão cada vez mais habituados a plataformas digitais para agendar serviços em diversas áreas (saúde, beleza, alimentação), mas no segmento automotivo esse tipo de solução ainda é escasso e fragmentado.

## 2. Problema Identificado

### Para o Cliente:
- **Falta de visibilidade**: não sabe quais oficinas existem próximas, quais serviços oferecem ou quanto cobram
- **Agendamento por telefone**: ligações não atendidas, horários perdidos, falta de confirmação
- **Sem histórico**: não tem registro organizado dos serviços já realizados no veículo
- **Confiança**: dificuldade em avaliar a qualidade de uma oficina antes de ir

### Para a Oficina:
- **Gestão manual**: uso de cadernos ou planilhas para controlar agenda
- **No-shows**: clientes que não comparecem sem aviso
- **Sem presença digital**: perde clientes que buscam no Google ou apps
- **Comunicação falha**: contato apenas por WhatsApp pessoal, sem organização

### Para o Mercado:
- Não existe uma plataforma integrada e acessível que conecte oficinas e clientes de forma estruturada no modelo de agendamento, similar ao que Doctoralia faz para saúde ou iFood para alimentação

## 3. Solução Proposta

A **TechMotors** é uma plataforma web de agendamentos automotivos que conecta clientes a oficinas mecânicas, oferecendo:

| Funcionalidade | Problema que resolve |
|----------------|---------------------|
| Busca por localização e serviço | Cliente encontra oficina ideal rapidamente |
| Agendamento online em 4 passos | Elimina ligações e espera |
| Avaliações com estrelas | Gera confiança e transparência |
| Agenda visual para oficina | Substitui caderno/planilha |
| Notificações automáticas | Reduz no-shows e melhora comunicação |
| Histórico do veículo | Prontuário digital acessível |
| Chat integrado (bot + humano) | Tira dúvidas sem sair da plataforma |
| Painel de métricas | Oficina acompanha performance |

## 4. Objetivos

### Objetivo Geral
Desenvolver uma plataforma web para agendamento de serviços automotivos que facilite a conexão entre clientes e oficinas mecânicas, promovendo organização, transparência e agilidade.

### Objetivos Específicos
1. Implementar sistema de cadastro diferenciado para clientes (CPF) e oficinas (CNPJ) com aprovação administrativa
2. Desenvolver mecanismo de busca com geolocalização e filtros por categoria de serviço
3. Criar fluxo de agendamento intuitivo com seleção de serviço, data, horário e veículo
4. Implementar sistema de avaliações para promover transparência e qualidade
5. Desenvolver painel de gestão para oficinas com agenda, métricas e histórico
6. Integrar chatbot com regras predefinidas e opção de atendimento humano
7. Garantir experiência responsiva e acessível em dispositivos móveis

## 5. Justificativa

O projeto se justifica por:

1. **Relevância social**: democratiza o acesso a serviços automotivos de qualidade, permitindo que clientes tomem decisões informadas
2. **Viabilidade técnica**: utiliza tecnologias open-source e amplamente documentadas (Node.js, SQLite, Bootstrap)
3. **Impacto econômico**: ajuda pequenas oficinas a se digitalizarem sem custo de software proprietário
4. **Lacuna de mercado**: não há solução dominante no Brasil para agendamento automotivo online
5. **Aplicação acadêmica**: integra conceitos de banco de dados, engenharia de software, UX e segurança da informação

## 6. Público-Alvo

- **Clientes**: proprietários de veículos (carros e motos) que buscam praticidade no agendamento de serviços
- **Oficinas**: micro e pequenas oficinas mecânicas que desejam organizar sua gestão e ampliar clientela
- **Faixa etária predominante**: 25-55 anos, com familiaridade básica com tecnologia

## 7. Tecnologias Utilizadas

| Camada | Tecnologia | Justificativa |
|--------|-----------|---------------|
| Backend | Node.js + Express + TypeScript | Performance, tipagem, ecossistema robusto |
| Banco de dados | SQLite (better-sqlite3) | Leve, sem servidor, ideal para MVP |
| Frontend | HTML5 + CSS3 + JavaScript (SPA) | Sem framework pesado, carregamento rápido |
| UI Framework | Bootstrap 5 | Responsividade, componentes prontos |
| Autenticação | JWT + bcrypt | Padrão seguro da indústria |
| Geolocalização | API nativa do navegador | Sem custo de API externa |
| Mapa | OpenStreetMap Embed | Open-source, sem chave de API |
| E-mail | Nodemailer + Gmail SMTP | Recuperação de senha funcional |
| Chat | Implementação própria (rule-based) | Sem dependência de API paga |

## 8. Metodologia

O desenvolvimento seguiu a metodologia ágil com ciclos iterativos:

1. **Levantamento de requisitos** — identificação dos atores e funcionalidades
2. **Modelagem de dados** — definição do esquema relacional (DER)
3. **Prototipação** — interface construída iterativamente
4. **Implementação** — desenvolvimento backend e frontend em paralelo
5. **Testes** — validação funcional com dados de teste (seed)
6. **Documentação** — diagramas, API e manual do sistema
