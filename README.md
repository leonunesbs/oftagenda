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
   - `NEXT_PUBLIC_TRIAGE_E2E_PUBLIC_KEY`
   - `NEXT_PUBLIC_TRIAGE_E2E_KEY_VERSION`

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
  - valida envelope criptografado com Zod
  - persiste triagem cifrada no Convex vinculada ao agendamento ativo
- `GET /api/integrations/n8n/docs`
  - resumo dos endpoints de integração para n8n/chatbot
  - exige `x-api-key` ou `Authorization: Bearer <N8N_OFTAGENDA_API_KEY>`
  - suporta link de encaminhamento com `waUserId` para vincular WhatsApp ao `publicMetadata` do Clerk
  - documentação completa em `docs/n8n-api.md`

## Criptografia ponta a ponta da triagem

Para os dados de saude da triagem de dilatacao, o cliente cifra o payload antes do envio usando `RSA-OAEP/AES-GCM-256`.

### Variaveis necessarias

- `NEXT_PUBLIC_TRIAGE_E2E_PUBLIC_KEY`: chave publica RSA em base64 no formato SPKI (sem headers PEM)
- `NEXT_PUBLIC_TRIAGE_E2E_KEY_VERSION`: versao da chave para rotacao (ex.: `v1`)
- `TRIAGE_E2E_PRIVATE_KEY`: chave privada RSA PKCS8 (PEM com `\n` ou base64 DER em linha unica) usada apenas no servidor para descriptografia autorizada

### Como gerar as chaves (OpenSSL)

1. Gerar chave privada RSA 4096 (guardar em local seguro):

```bash
mkdir -p .secrets/triage-e2e
openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:4096 -out .secrets/triage-e2e/private-key.pem
```

2. Derivar chave publica:

```bash
openssl rsa -pubout -in .secrets/triage-e2e/private-key.pem -out .secrets/triage-e2e/public-key.pem
```

3. Converter a chave publica para DER/SPKI e base64 em uma linha:

```bash
openssl pkey -pubin -in .secrets/triage-e2e/public-key.pem -outform DER | base64 | tr -d '\n'
```

4. Copiar a saida do comando acima para `NEXT_PUBLIC_TRIAGE_E2E_PUBLIC_KEY`.

5. Definir `NEXT_PUBLIC_TRIAGE_E2E_KEY_VERSION` (ex.: `v1`).

6. Definir a chave privada no servidor (`TRIAGE_E2E_PRIVATE_KEY`) de uma destas formas:

```bash
# opcao A: PEM escapado em uma linha
awk 'NF {sub(/\r/, ""); printf "%s\\n",$0;}' .secrets/triage-e2e/private-key.pem
```

```bash
# opcao B: DER base64 em uma linha
openssl pkey -in .secrets/triage-e2e/private-key.pem -outform DER | base64 | tr -d '\n'
```

### Rotacao de chave

- Gere novo par de chaves e publique a nova chave publica com versao incrementada (`v2`, `v3`, ...).
- Mantenha as chaves privadas antigas para leitura/decriptacao historica, enquanto houver dados cifrados com elas.

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
