# Integracao n8n <-> oftagenda

Esta API permite que o fluxo do n8n (chatbot) consulte disponibilidade e gerencie agendamentos por telefone.

## Configuracao

Defina no servidor:

```env
N8N_OFTAGENDA_FORWARD_ORIGIN=https://agenda.oftleonardo.com.br
```

Esta integracao nao exige autenticacao por header nesta versao.

## Endpoints

Base (use o dominio real do OftAgenda, sem placeholder):

- Producao: `https://agenda.oftleonardo.com.br`
- Desenvolvimento local: `http://localhost:3000`

Exemplos de URL completas:

- `GET https://agenda.oftleonardo.com.br/api/integrations/n8n/locations`
- `GET https://agenda.oftleonardo.com.br/api/integrations/n8n/availability?location=fortaleza&daysAhead=14`
- `POST https://agenda.oftleonardo.com.br/api/integrations/n8n/resumo-link`

### 1) Listar locais

- `GET /api/integrations/n8n/locations`

Resposta:

```json
{
  "ok": true,
  "locations": [
    { "value": "fortaleza", "label": "Fortaleza", "address": "..." }
  ]
}
```

### 2) Consultar datas e horarios por local

- `GET /api/integrations/n8n/availability?location=fortaleza&daysAhead=14`

Resposta:

```json
{
  "ok": true,
  "options": {
    "location": "fortaleza",
    "dates": [
      {
        "isoDate": "2026-03-20",
        "label": "20/03",
        "weekdayLabel": "sex.",
        "times": ["08:00", "08:30", "09:00"]
      }
    ]
  }
}
```

### 3) Consultar agendamentos por telefone

- `GET /api/integrations/n8n/appointments?phone=5599999999999&includeHistory=true`

Resposta:

```json
{
  "ok": true,
  "phone": "5599999999999",
  "total": 1,
  "activeAppointment": {
    "appointmentId": "j57...",
    "status": "confirmed"
  },
  "appointments": [
    {
      "appointmentId": "j57...",
      "name": "Paciente",
      "phone": "+55 (99) 99999-9999",
      "email": "paciente@exemplo.com",
      "location": "fortaleza",
      "status": "confirmed",
      "requestedAt": 1770000000000,
      "scheduledFor": 1770003600000
    }
  ]
}
```

### 4) Atualizar status de agendamento

- `PATCH /api/integrations/n8n/appointments`

Body:

```json
{
  "appointmentId": "j57...",
  "phone": "5599999999999",
  "status": "cancelled",
  "reason": "Paciente pediu cancelamento pelo WhatsApp"
}
```

`status` permitido: `confirmed`, `rescheduled`, `cancelled`, `completed`.

### 5) Cancelar agendamento (atalho)

- `POST /api/integrations/n8n/appointments/cancel`

Body:

```json
{
  "appointmentId": "j57...",
  "phone": "5599999999999",
  "reason": "Paciente pediu cancelamento pelo WhatsApp"
}
```

### 6) Gerar link de encaminhamento para pagina de resumo

- `POST /api/integrations/n8n/resumo-link`

Body:

```json
{
  "location": "fortaleza",
  "date": "2026-03-20",
  "time": "14:00",
  "source": "n8n",
  "utmSource": "whatsapp",
  "utmMedium": "chatbot",
  "utmCampaign": "agendamento_n8n",
  "utmContent": "fire_assistente"
}
```

Campos opcionais de tracking aceitos neste endpoint:

- UTM: `utmSource`, `utmMedium`, `utmCampaign`, `utmContent`, `utmTerm`
- Click IDs: `gclid`, `gbraid`, `wbraid`, `fbclid`, `msclkid`

Resposta:

```json
{
  "ok": true,
  "summaryUrl": "https://agenda.oftleonardo.com.br/agendar/resumo?location=fortaleza&date=2026-03-20&time=14%3A00&source=n8n&utm_source=whatsapp&utm_medium=chatbot&utm_campaign=agendamento_n8n&utm_content=fire_assistente"
}
```

Com esse `summaryUrl`, o chatbot pode encaminhar o paciente para revisar a selecao e seguir para pagamento.

### 7) Consultar contexto do paciente por telefone

- `GET /api/integrations/n8n/patient-context?phone=5585999999999`

Retorna contexto completo apenas se o telefone estiver vinculado a uma conta (via verificacao por email).

Resposta quando vinculado:

```json
{
  "ok": true,
  "linked": true,
  "patient": {
    "name": "Maria Silva",
    "email": "m***a@email.com",
    "registeredAt": 1700000000000
  },
  "summary": {
    "totalAppointments": 3,
    "hasActiveAppointment": true,
    "lastVisitLocation": "fortaleza",
    "frequentConsultationType": "retina"
  },
  "activeAppointment": { "..." : "..." },
  "recentHistory": ["..."],
  "triageHighlights": {
    "conditions": ["diabetes"],
    "lastReason": "retina_follow",
    "dilatationLevel": "ALTA"
  }
}
```

Resposta quando nao vinculado:

```json
{
  "ok": true,
  "linked": false,
  "patient": null
}
```

### 8) Solicitar vinculacao de WhatsApp (magic link por email)

- `POST /api/integrations/n8n/phone-link/request`

Body:

```json
{
  "phone": "5585999999999",
  "email": "paciente@email.com"
}
```

Se o email corresponder a uma conta no Clerk (ou a um paciente cadastrado no Convex), envia magic link por email. O paciente clica no botao no email e a vinculacao e ativada automaticamente.

Resposta:

```json
{
  "ok": true,
  "emailSent": true
}
```

Rate limit: maximo 3 solicitacoes por telefone a cada 30 minutos. Token valido por 30 minutos e uso unico.

## Endpoint rapido de referencia

- `GET /api/integrations/n8n/docs`

Retorna um resumo JSON da integracao (rotas e exemplos) para facilitar configuração no n8n.
