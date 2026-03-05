import type { Metadata } from "next";
import Link from "next/link";

import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "Política de Privacidade",
  description: "Política de privacidade da plataforma Minha Agenda em conformidade com a LGPD.",
  alternates: {
    canonical: "/politica-de-privacidade",
  },
};

export default function PrivacyPolicyPage() {
  const oftleonardoPrivacyUrl = `${siteConfig.social.oftleonardoSite}/politica-de-privacidade`;

  return (
    <section className="mx-auto w-full max-w-3xl space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Política de Privacidade</h1>
        <p className="text-sm text-muted-foreground">Última atualização: 05 de março de 2026</p>
      </header>

      <div className="space-y-6 text-sm leading-relaxed text-muted-foreground">
        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">1. Escopo desta política</h2>
          <p>
            Esta política se aplica exclusivamente ao app <strong>{siteConfig.name}</strong>{" "}
            (<strong>{siteConfig.domain}</strong>), responsável pelo fluxo de agendamento online e
            gerenciamento da reserva.
          </p>
          <p>
            Se você acessou o agendamento a partir do site institucional do Dr. Leonardo
            (oftleonardo.com.br), consulte também a política específica daquele site em{" "}
            <Link
              href={oftleonardoPrivacyUrl}
              className="underline underline-offset-2 hover:text-foreground"
              target="_blank"
              rel="noopener noreferrer"
            >
              oftleonardo.com.br/politica-de-privacidade
            </Link>
            .
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">2. Introdução</h2>
          <p>
            Esta Política descreve como a plataforma <strong>{siteConfig.name}</strong> trata dados
            relacionados ao uso do serviço, em conformidade com a Lei Geral de Proteção de Dados
            (Lei 13.709/2018 - LGPD).
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">3. Dados tratados</h2>
          <p>Durante o uso da plataforma, podemos tratar dados como:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>dados de navegação e interação para desempenho e segurança;</li>
            <li>informações de agendamento inseridas pelo usuário;</li>
            <li>dados técnicos de dispositivo e navegador.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">4. Cookies e consentimento</h2>
          <p>
            Utilizamos cookies e tecnologias similares para funcionalidades essenciais e, quando autorizado,
            para analytics e mensuração. Você pode escolher entre aceitar cookies opcionais ou manter apenas
            os essenciais no banner de consentimento.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">5. Finalidades do tratamento</h2>
          <p>Os dados são utilizados para:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>operar e melhorar o fluxo de agendamento;</li>
            <li>prevenir fraudes e manter a segurança da plataforma;</li>
            <li>cumprir obrigações legais e regulatórias.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">6. Compartilhamento</h2>
          <p>
            Podemos compartilhar dados com operadores e parceiros tecnológicos estritamente necessários para
            operação da plataforma (por exemplo, infraestrutura, autenticação, analytics e pagamentos), sempre
            conforme exigências legais e contratuais de proteção de dados.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">7. Direitos do titular</h2>
          <p>
            Nos termos da LGPD, você pode solicitar confirmação de tratamento, acesso, correção, anonimização,
            eliminação, portabilidade e revogação de consentimento quando aplicável.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">8. Retenção e segurança</h2>
          <p>
            Adotamos medidas técnicas e administrativas para proteger os dados. O período de retenção varia
            conforme finalidade, exigências legais e natureza do serviço prestado.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">9. Alterações desta política</h2>
          <p>
            Esta Política pode ser atualizada periodicamente. Recomendamos consulta regular desta página para
            acompanhar eventuais alterações.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">10. Contato</h2>
          <p>
            Para dúvidas ou solicitações relacionadas a dados pessoais, entre em contato pelo e-mail{" "}
            <Link
              href="mailto:contato@oftleonardo.com.br"
              className="underline underline-offset-2 hover:text-foreground"
            >
              contato@oftleonardo.com.br
            </Link>
            .
          </p>
        </section>
      </div>
    </section>
  );
}
