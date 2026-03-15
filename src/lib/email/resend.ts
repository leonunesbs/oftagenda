import { Resend } from "resend";

import { serverEnv } from "@/lib/env/server";

const DEFAULT_FROM = "OFT Leonardo <noreply@oftleonardo.com.br>";
const BRAND_LOGO_MIN_URL = "https://oftleonardo.com.br/mono_dark.svg";

function getResendClient() {
  const apiKey = serverEnv.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY não configurada. Defina a variável de ambiente para enviar emails.");
  }
  return new Resend(apiKey);
}

function getFromAddress() {
  const custom = serverEnv.RESEND_FROM_EMAIL;
  return custom ? `OFT Leonardo <${custom}>` : DEFAULT_FROM;
}

export async function sendPhoneVerificationEmail({
  to,
  confirmUrl,
  phone,
}: {
  to: string;
  confirmUrl: string;
  phone: string;
}) {
  const resend = getResendClient();
  const maskedPhone = maskPhone(phone);

  const { data, error } = await resend.emails.send({
    from: getFromAddress(),
    to,
    subject: "Confirme seu número de WhatsApp — OFT Leonardo",
    html: buildVerificationHtml({ confirmUrl, maskedPhone }),
  });

  if (error) {
    throw new Error(`Falha ao enviar email de verificação: ${error.message}`);
  }

  return { emailId: data?.id };
}

export async function sendReservationLifecycleEmail({
  to,
  patientName,
  subject,
  title,
  summary,
  details,
}: {
  to: string;
  patientName?: string;
  subject: string;
  title: string;
  summary: string;
  details: string[];
}) {
  if (!serverEnv.RESEND_API_KEY) {
    return { skipped: true as const };
  }

  const resend = getResendClient();
  const safeName = patientName?.trim() || "Paciente";
  const detailsHtml = details.map((item) => `<li style="margin:0 0 8px">${escapeHtml(item)}</li>`).join("");

  const { data, error } = await resend.emails.send({
    from: getFromAddress(),
    to,
    subject,
    html: `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 16px">
    <tr><td align="center">
      <table width="100%" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden">
        <tr><td style="padding:28px">
          <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 16px">
            <tr>
              <td align="center">
                <img src="${BRAND_LOGO_MIN_URL}" alt="OFT Leonardo" width="36" height="36" style="display:block;width:36px;height:36px;border:0;outline:none;text-decoration:none">
              </td>
            </tr>
          </table>
          <h1 style="margin:0 0 8px;font-size:20px;color:#18181b">${escapeHtml(title)}</h1>
          <p style="margin:0 0 16px;font-size:14px;color:#52525b;line-height:1.5">Olá, ${escapeHtml(safeName)}.</p>
          <p style="margin:0 0 16px;font-size:15px;color:#3f3f46;line-height:1.5">${escapeHtml(summary)}</p>
          <ul style="margin:0 0 16px 18px;padding:0;font-size:14px;color:#52525b;line-height:1.5">
            ${detailsHtml}
          </ul>
          <p style="margin:0;font-size:13px;color:#71717a">
            Em caso de dúvida, responda este e-mail ou fale com nossa equipe.
          </p>
        </td></tr>
        <tr><td style="padding:16px 28px;border-top:1px solid #e4e4e7">
          <p style="margin:0;font-size:12px;color:#a1a1aa">OFT Leonardo — Oftalmologia</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  });

  if (error) {
    throw new Error(`Falha ao enviar email de atualização da reserva: ${error.message}`);
  }

  return { emailId: data?.id, skipped: false as const };
}

function maskPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 4) return "****";
  return `****${digits.slice(-4)}`;
}

function buildVerificationHtml({
  confirmUrl,
  maskedPhone,
}: {
  confirmUrl: string;
  maskedPhone: string;
}) {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 16px">
    <tr><td align="center">
      <table width="100%" style="max-width:480px;background:#ffffff;border-radius:12px;overflow:hidden">
        <tr><td style="padding:32px 28px 0">
          <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 16px">
            <tr>
              <td align="center">
                <img src="${BRAND_LOGO_MIN_URL}" alt="OFT Leonardo" width="36" height="36" style="display:block;width:36px;height:36px;border:0;outline:none;text-decoration:none">
              </td>
            </tr>
          </table>
          <h1 style="margin:0 0 8px;font-size:20px;color:#18181b">Confirmar número de WhatsApp</h1>
          <p style="margin:0 0 24px;font-size:15px;color:#52525b;line-height:1.5">
            Recebemos uma solicitação para vincular o WhatsApp <strong>${maskedPhone}</strong> à sua conta na OFT Leonardo.
          </p>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td align="center" style="padding:8px 0 24px">
              <a href="${confirmUrl}" target="_blank"
                 style="display:inline-block;background:#18181b;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:12px 32px;border-radius:8px">
                Confirmar meu número
              </a>
            </td></tr>
          </table>
          <p style="margin:0 0 8px;font-size:13px;color:#a1a1aa;line-height:1.5">
            Este link é válido por 30 minutos. Se você não solicitou essa vinculação, ignore este email.
          </p>
        </td></tr>
        <tr><td style="padding:20px 28px;border-top:1px solid #e4e4e7">
          <p style="margin:0;font-size:12px;color:#a1a1aa">OFT Leonardo — Oftalmologia</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
