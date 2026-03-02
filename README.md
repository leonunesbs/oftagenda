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

2. No Clerk, crie o JWT template `convex` e copie o issuer domain (Frontend API URL).

3. Preencha no `.env.local`:
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - `CLERK_SECRET_KEY`
   - `CLERK_JWT_ISSUER_DOMAIN`

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
npm run dev
```

> `npm run dev` agora sobe Next.js + Convex juntos (`convex dev --run-sh "next dev"`).

Opcional (fluxo original do template):

```bash
pnpm install
pnpm dev
```

## Rotas principais

### Publicas

- `/` landing do Minha Agenda
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

## Deploy unico na Vercel (Next.js + Convex)

1. No dashboard do Convex, gere um **Deploy Key** para o projeto.
2. Na Vercel, configure as variaveis de ambiente de Production:
   - `CONVEX_DEPLOY_KEY`
   - `NEXT_PUBLIC_CONVEX_URL`
   - `NEXT_PUBLIC_CONVEX_SITE_URL`
   - `CLERK_SECRET_KEY`
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - `CLERK_JWT_ISSUER_DOMAIN`
3. Faça deploy normal pela Vercel (git push / Deploy).

No build de producao, o script `npm run build` publica automaticamente o Convex e em seguida executa o `next build`.

## TODOs de produto

- Integrar Cal.com (ou sistema real) para horarios e confirmacao real
- Ativar Clerk Billing por entitlements
- Adequacao LGPD (consentimento, retencao, auditoria)
- Rate limiting nas APIs
