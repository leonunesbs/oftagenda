# Minha Agenda

MVP de agendamento oftalmologico com foco em **agendar primeiro, preparar depois**.

## Filosofia do produto

1. Antes da confirmacao do agendamento: coletar o minimo necessario.
2. Depois da confirmacao: liberar triagem opcional para orientacoes de preparo em `/detalhes`, somente client-side.

## Stack

- Next.js App Router + TypeScript
- Tailwind CSS v4 + shadcn/ui
- Zod para validacao
- Clerk para autenticacao
- Convex para backend + banco de dados
- Stripe Checkout + Webhook para pagamentos
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
   - `STRIPE_SECRET_KEY`
   - `STRIPE_WEBHOOK_SECRET`

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
- `/detalhes` triagem opcional para orientacoes de preparo, sem envio para API

### APIs

- `POST /api/booking/confirm`
  - valida payload com Zod (`name`, `phone`, `email` obrigatorios)
  - persiste agendamento no Convex e registra evento no historico
  - mantem cookie de fallback `booking_confirmed=true`
- `GET /api/integrations/n8n/docs`
  - resumo dos endpoints de integração para n8n/chatbot
  - sem exigência de autenticação por header nesta versão
  - suporta link de encaminhamento para resumo pré-agendamento com local/data/horário
  - documentação completa em `docs/n8n-api.md`

## Fluxo do MVP

1. Paciente entra e confirma agendamento em 2 etapas:
   - Local
   - Periodo preferido
   - Nome, telefone e email (obrigatorios)
   - Motivo curto opcional
2. Apos confirmar, segue para o dashboard.
3. Dashboard mostra proxima consulta + historico/programacao persistidos.
4. `/detalhes` exibe triagem local para orientacoes de preparo, sem persistencia de dados clinicos.

## Billing (futuro)

- Arquivo: `src/config/billing.ts`
- Flag atual: `BILLING_ENABLED=false`
- TODO: validar entitlements do Clerk quando habilitar billing

## Pagamentos Stripe Checkout + Link

O fluxo atual usa `Stripe Checkout` hospedado. O `Link` e habilitado como metodo dentro do Checkout (sem migracao para Elements).
Referencias oficiais:
- https://docs.stripe.com/payments/link
- https://docs.stripe.com/payments/link/checkout-link

### Backend atual

- Criacao da sessao: `POST /api/stripe/checkout`
- Confirmacao/reconciliacao: `POST /api/stripe/webhook`
- Nao ha env dedicada para Link no backend; o comportamento depende da configuracao no Dashboard Stripe.

### Variaveis de ambiente

- `STRIPE_SECRET_KEY` (obrigatoria)
- `STRIPE_WEBHOOK_SECRET` (obrigatoria)
- `STRIPE_PRICE_ID` (opcional, fallback de preco em alguns cenarios)

### Habilitacao do Link (test e live)

1. Stripe Dashboard -> **Payment methods**.
2. Ative `Link` nas configuracoes de **test** e **live**.
3. Confirme o dominio registrado para pagamentos (exigencia do Stripe para Link).
4. Se o Checkout usa metodos dinamicos (padrao atual), nao force `payment_method_types` manualmente.

### Observacao para Brasil

- A exibicao do Link depende de elegibilidade da conta/pais/moeda.
- Quando Link nao estiver elegivel, o Checkout continua com fallback para os demais metodos habilitados (ex.: cartao), sem quebrar o fluxo.

### Checklist de validacao (ponta a ponta)

1. Inicie um pagamento em `/agendar/resumo`.
2. Verifique o redirecionamento para o `Stripe Checkout`.
3. Confirme se o Link aparece quando elegivel para a conta e contexto.
4. Finalize o pagamento e confirme retorno para `/dashboard?payment=success`.
5. Verifique processamento do webhook em `POST /api/stripe/webhook`.
6. Confirme status final da reserva/pagamento no dashboard.

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
