# Segurança do Sistema — TechMotors

## 1. Visão Geral

A segurança da plataforma TechMotors foi projetada em múltiplas camadas, abrangendo autenticação, autorização, proteção de dados, defesa contra ataques comuns e boas práticas de desenvolvimento seguro.

---

## 2. Autenticação

| Mecanismo | Implementação | Proteção |
|-----------|---------------|----------|
| **Hash de senhas** | bcrypt com 10 salt rounds | Senhas nunca armazenadas em texto puro; resistente a rainbow tables |
| **Política de senha forte** | Mín. 8 chars, 1 maiúscula, 1 número, 1 especial | Reduz risco de senhas fracas/adivinhadas |
| **JWT com expiração** | Token expira em 24h | Limita janela de comprometimento |
| **Chave secreta via env** | `JWT_SECRET` em variável de ambiente | Não fica no código-fonte |
| **Recuperação de senha** | Token aleatório (32 bytes hex) com expiração de 30min | Link temporário e de uso único |

---

## 3. Autorização (Controle de Acesso)

| Camada | Mecanismo | Descrição |
|--------|-----------|-----------|
| **Middleware de tipo** | `exigirTipo('cliente'/'oficina'/'admin')` | Rotas acessíveis apenas pelo tipo correto de usuário |
| **Isolamento de dados** | WHERE `usuario_id=?` em todas as queries | Cliente só acessa seus dados; oficina só acessa os dela |
| **Aprovação administrativa** | Oficinas precisam de aprovação do admin | Impede oficinas falsas na plataforma |
| **Status de conta** | Contas podem ser bloqueadas pelo admin | Controle sobre usuários problemáticos |

### Matriz de Acesso

| Recurso | Cliente | Oficina | Admin |
|---------|---------|---------|-------|
| Agendamentos próprios | ✅ | ✅ | — |
| Dados de outros clientes | ❌ | Apenas nome/tel do agendamento | ✅ |
| Configurar serviços/agenda | ❌ | ✅ (seus) | — |
| Aprovar oficinas | ❌ | ❌ | ✅ |
| Bloquear usuários | ❌ | ❌ | ✅ |

---

## 4. Proteção contra Ataques

### 4.1 Rate Limiting (Força Bruta)

| Rota | Limite | Janela | Proteção |
|------|--------|--------|----------|
| `/api/auth/login` | 5 tentativas | 15 minutos | Previne brute-force de senha |
| `/api/auth/esqueci-senha` | 3 tentativas | 1 hora | Previne spam de e-mails |
| `/api/auth/cadastro` | 5 tentativas | 1 hora | Previne criação em massa de contas |

Ao exceder o limite, retorna HTTP 429 com header `Retry-After`.

### 4.2 Cross-Site Scripting (XSS)

| Camada | Mecanismo |
|--------|-----------|
| **Frontend** | Função `escapeHtml()` aplicada em toda exibição de dados do usuário |
| **Backend** | Sanitização de input: remove `<script>`, `<iframe>` e handlers `onXXX=` |
| **CSP Header** | Restringe fontes de scripts a `'self'` e CDNs confiáveis |
| **X-XSS-Protection** | Ativa filtro nativo do navegador |

### 4.3 SQL Injection

| Mecanismo | Descrição |
|-----------|-----------|
| **Prepared Statements** | Todas as queries usam `?` como placeholder (better-sqlite3) |
| **Sem concatenação de SQL** | Parâmetros nunca interpolados diretamente na query string |
| **Validação de tipos** | `parseInt()` aplicado em IDs antes de usar em queries |

### 4.4 Cross-Site Request Forgery (CSRF)

| Mecanismo | Descrição |
|-----------|-----------|
| **Token JWT no header** | Requisições autenticadas usam `Authorization: Bearer` |
| **Não usa cookies** | JWT não fica em cookies, eliminando CSRF clássico |

### 4.5 Clickjacking

| Header | Valor | Proteção |
|--------|-------|----------|
| `X-Frame-Options` | `SAMEORIGIN` | Impede embedding em iframes de outros sites |

### 4.6 Upload de Arquivos

| Mecanismo | Descrição |
|-----------|-----------|
| **Filtro de extensão** | Apenas .jpg, .jpeg, .png, .webp aceitos |
| **Limite de tamanho** | Máximo 5MB por arquivo |
| **Nome aleatório** | Arquivo renomeado com timestamp, impede directory traversal |
| **Remoção do antigo** | Ao trocar foto, arquivo anterior é deletado do servidor |

---

## 5. Headers de Segurança HTTP

Todos os responses incluem:

```
X-Frame-Options: SAMEORIGIN
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(self), camera=(), microphone=()
Content-Security-Policy: default-src 'self'; script-src 'self' https://cdn.jsdelivr.net 'unsafe-inline'; ...
```

---

## 6. Proteção de Dados Sensíveis

| Dado | Proteção |
|------|----------|
| Senhas | Hash bcrypt (irreversível) |
| CPF/CNPJ | Armazenados no banco, acessíveis apenas pelo próprio usuário |
| E-mail | Não exposto para outros usuários (exceto admin) |
| Telefone | Visível apenas em contexto necessário (oficina vê do cliente no agendamento) |
| Token JWT | Armazenado no localStorage, transmitido via header |
| Fotos de perfil | Armazenadas localmente, não em serviço externo |
| `.env` | Excluído do Git via .gitignore |

---

## 7. Configuração de Ambiente

O arquivo `.env.example` documenta as variáveis necessárias:

```env
JWT_SECRET=chave_secreta_aleatoria
EMAIL_USER=email@gmail.com
EMAIL_PASS=senha-de-app
CORS_ORIGIN=http://meudominio.com
PORT=3000
```

Em produção, recomenda-se:
- `JWT_SECRET` com no mínimo 64 caracteres aleatórios
- HTTPS obrigatório (certificado SSL/TLS)
- `CORS_ORIGIN` restrito ao domínio da aplicação
- Banco de dados com backup automático

---

## 8. Boas Práticas Implementadas

1. **Princípio do menor privilégio** — cada rota só acessa o que precisa
2. **Falha segura** — erros genéricos para o usuário, detalhes no log do servidor
3. **Não revelar existência de e-mail** — recuperação de senha retorna mensagem genérica
4. **Expiração de tokens** — JWT 24h, reset 30min
5. **Validação em duas camadas** — frontend valida UX, backend valida segurança
6. **Limite de payload** — body limitado a 2MB
7. **Logs do servidor** — registra ações importantes (envio de e-mail, resets)

---

## 9. Conformidade com LGPD (Lei Geral de Proteção de Dados)

| Requisito | Implementação |
|-----------|---------------|
| **Consentimento** | Checkbox obrigatório de aceite dos Termos no cadastro |
| **Minimização** | Coleta apenas dados necessários para o serviço |
| **Acesso** | Usuário visualiza todos seus dados no perfil |
| **Correção** | Usuário pode editar seus dados a qualquer momento |
| **Eliminação** | Admin pode desativar contas (dados preservados por obrigação legal) |
| **Segurança** | Criptografia de senhas, controle de acesso, headers de segurança |

---

## 10. Recomendações para Produção

| Item | Prioridade | Descrição |
|------|-----------|-----------|
| HTTPS | Alta | Certificado SSL (Let's Encrypt gratuito) |
| Backup do banco | Alta | Cópia diária do arquivo SQLite |
| Monitoramento | Média | Logs de acesso e erros |
| Migração para PostgreSQL | Média | Para cenários com mais de 1000 usuários |
| 2FA (autenticação em dois fatores) | Baixa | Para contas administrativas |
| WAF (Web Application Firewall) | Baixa | Proteção adicional em cloud |
