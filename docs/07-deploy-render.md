# Deploy no Render — TechMotors

Guia para colocar o TechMotors no ar com um domínio, usando o [Render](https://render.com).

## Visão geral

O app é um servidor Node/Express que serve o próprio frontend e usa SQLite em
arquivo. No Render ele roda como um **Web Service**, com o banco em um **disco
persistente** para não perder os dados entre deploys.

> ⚠️ **Sobre o plano free:** o disco persistente exige plano pago (Starter, ~US$7/mês).
> No plano free o site funciona, mas o banco SQLite é **resetado a cada deploy**
> (volta ao seed). Para dados que persistem de verdade, use o plano com disco.

## Pré-requisitos

- Conta no Render (login com GitHub facilita)
- O repositório já no GitHub (já está: `Eduardosnt/techmotors`)
- O branch com as mudanças mergeado na `main` (ou aponte o deploy para o branch desejado)

## Opção A — Deploy via Blueprint (mais rápido)

O repositório já inclui um `render.yaml` na raiz.

1. No Render: **New > Blueprint**.
2. Conecte o repositório `techmotors`.
3. O Render lê o `render.yaml` e propõe o serviço `techmotors`.
4. Preencha as variáveis marcadas como `sync: false`:
   - `CORS_ORIGIN` → a URL final do site (ex.: `https://techmotors.onrender.com`).
     Pode deixar em branco no primeiro deploy e ajustar depois que souber a URL.
   - `EMAIL_USER` / `EMAIL_PASS` → só se quiser o fluxo de recuperação de senha.
5. Clique em **Apply**. O primeiro deploy roda `npm install && npm run build` e sobe com `npm start`.

## Opção B — Deploy manual (sem Blueprint)

1. **New > Web Service** e conecte o repositório.
2. Configurações:
   - **Root Directory:** `backend`
   - **Runtime:** Node
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
   - **Health Check Path:** `/`
3. Em **Environment**, adicione:
   | Variável | Valor |
   |----------|-------|
   | `NODE_VERSION` | `22.9.0` |
   | `NODE_ENV` | `production` |
   | `JWT_SECRET` | uma string longa e aleatória |
   | `DB_PATH` | `/var/data/techmotors.db` (se usar disco) |
   | `CORS_ORIGIN` | a URL do site |
4. (Plano pago) Em **Disks**, adicione um disco:
   - **Mount Path:** `/var/data`
   - **Size:** 1 GB
5. **Create Web Service**.

## Domínio próprio

1. Compre o domínio (Registro.br para `.com.br`, Cloudflare/Namecheap para `.com`).
2. No serviço do Render: **Settings > Custom Domains > Add Custom Domain**.
3. O Render mostra um registro DNS (CNAME) para você criar no seu registrador.
4. Após a propagação do DNS, o Render emite o certificado HTTPS automaticamente.
5. Atualize a env `CORS_ORIGIN` para o domínio final e faça um novo deploy.

## Checklist pós-deploy

- [ ] Site abre na URL do Render
- [ ] Login funciona com as contas de teste (seed)
- [ ] `JWT_SECRET` definido (o servidor não sobe sem ele)
- [ ] `CORS_ORIGIN` apontando para o domínio real (não `*`)
- [ ] Disco persistente montado (se plano pago) e `DB_PATH` apontando para ele

## Variáveis de ambiente (resumo)

| Variável | Obrigatória | Descrição |
|----------|:-----------:|-----------|
| `JWT_SECRET` | ✅ | Chave de assinatura dos tokens. Sem ela o servidor não inicia. |
| `PORT` | ❌ | Definida automaticamente pelo Render. |
| `DB_PATH` | ❌ | Caminho do arquivo SQLite. Use o disco persistente em produção. |
| `CORS_ORIGIN` | ❌ | Domínio permitido. Em produção, evite `*`. |
| `NODE_VERSION` | ❌ | Fixe em `22.x` (o app usa `node:sqlite`, que exige Node ≥ 22.5). |
| `EMAIL_USER` / `EMAIL_PASS` | ❌ | Apenas para recuperação de senha por e-mail. |
