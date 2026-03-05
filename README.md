# Minha Agenda

MVP de agendamento oftalmologico com foco em **agendar primeiro, detalhes depois**.

## Filosofia do produto

1. Antes da confirmacao do agendamento: coletar o minimo necessario.
2. Depois da confirmacao: liberar triagem opcional e rapida em `/detalhes`.

## Stack

- Next.js App Router + TypeScript
- Tailwind CSS v4 + shadcn/ui
- Zod para validacao
- Clerk para autenticacao
- Convex para backend + banco de dados
- Billing via Clerk: **nao implementado agora** (somente feature flag)

## Como rodar

1. Copie o arquivo de exemplo de ambiente:

```bash
cp .env.example .env.local
```

2. No Clerk, ative a integração Convex e copie o Frontend API URL.

3. Preencha no `.env.local`:
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - `CLERK_SECRET_KEY`
   - `CLERK_FRONTEND_API_URL`

4. Instale dependencias:

```bash
npm install
```

5. Configure e sincronize o Convex:

```bash
npx convex dev
```

6. Rode o app:

```bash
pnpm dev
```

> `pnpm dev` agora abre um painel com logs separados de Convex e Next.js.

Diagnostico rapido:

```bash
pnpm run dev:convex # apenas Convex
pnpm run dev:next   # apenas Next.js
```

## Rotas principais

### Publicas

- `/` landing do Minha Agenda
- `/status` diagnostico de conectividade (Convex, Clerk e APIs internas)
- `/sign-in` autenticacao Clerk
- `/sign-up` cadastro Clerk

### Privadas (exigem login)

- `/dashboard` status do agendamento + CTA de detalhes
- `/agendar` fluxo sem atrito para confirmar solicitacao
- `/detalhes` triagem opcional apos agendamento confirmado

### APIs

- `POST /api/booking/confirm`
  - valida payload com Zod (`name`, `phone`, `email` obrigatorios)
  - persiste agendamento no Convex e registra evento no historico
  - mantem cookie de fallback `booking_confirmed=true`
- `POST /api/details/submit`
  - valida payload de triagem com Zod
  - persiste triagem no Convex vinculada ao agendamento ativo

## Fluxo do MVP

1. Paciente entra e confirma agendamento em 2 etapas:
   - Local
   - Periodo preferido
   - Nome, telefone e email (obrigatorios)
   - Motivo curto opcional
2. Apos confirmar, segue para o dashboard.
3. Dashboard mostra proxima consulta + historico/programacao persistidos.
4. Triagem detalhada fica em `/detalhes`, opcional, com orientacao de dilatacao conservadora.

## Billing (futuro)

- Arquivo: `src/config/billing.ts`
- Flag atual: `BILLING_ENABLED=false`
- TODO: validar entitlements do Clerk quando habilitar billing
- Nenhum SDK Stripe/webhook no MVP

## Deploy na Vercel (Next.js + Convex)

1. No dashboard do Convex, gere um **Deploy Key** de producao.
2. Na Vercel (Project Settings -> Environment Variables), configure em **Production**:
   - `CONVEX_DEPLOY_KEY`
   - `NEXT_PUBLIC_CONVEX_URL`
   - `NEXT_PUBLIC_CONVEX_SITE_URL`
   - `CLERK_SECRET_KEY`
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - `CLERK_FRONTEND_API_URL`
   - `STRIPE_SECRET_KEY`
   - `STRIPE_WEBHOOK_SECRET`
3. Confira os comandos de build do projeto:
   - Install Command: `pnpm install --frozen-lockfile`
   - Build Command: `pnpm build`
4. Faça o deploy normal pela Vercel (git push ou botão Deploy).

No build de producao, `pnpm build` faz deploy do Convex automaticamente quando `CONVEX_DEPLOY_KEY` estiver presente; caso contrario, roda apenas `next build`.

## TODOs de produto

- Integrar Cal.com (ou sistema real) para horários e confirmacao real
- Ativar Clerk Billing por entitlements
- Adequacao LGPD (consentimento, retencao, auditoria)
- Rate limiting nas APIs
