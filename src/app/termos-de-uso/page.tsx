import type { Metadata } from "next";
import Link from "next/link";

import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "Termos de Uso",
  description: "Termos de uso da plataforma Minha Agenda para agendamento oftalmológico.",
  alternates: {
    canonical: "/termos-de-uso",
  },
};

export default function TermsOfUsePage() {
  return (
    <section className="mx-auto w-full max-w-3xl space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Termos de Uso</h1>
        <p className="text-sm text-muted-foreground">Última atualização: 12 de março de 2026</p>
      </header>

      <div className="space-y-6 text-sm leading-relaxed text-muted-foreground">
        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">1. Aceitação</h2>
          <p>
            Ao acessar e utilizar a plataforma <strong>{siteConfig.name}</strong>, você concorda com estes
            Termos de Uso. Se não concordar, recomendamos que não utilize o serviço.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">2. Finalidade da plataforma</h2>
          <p>
            A Minha Agenda é uma plataforma digital de apoio ao agendamento oftalmológico. O objetivo é
            facilitar a reserva de horários, confirmação da consulta e acompanhamento das etapas do
            atendimento.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">3. Escopo e limite</h2>
          <p>
            O uso da plataforma não substitui consulta médica, diagnóstico ou tratamento. O conteúdo e o
            fluxo de agendamento têm caráter organizacional e informativo.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">4. Responsabilidades do usuário</h2>
          <p>Ao utilizar a plataforma, você se compromete a:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>fornecer informações verdadeiras e atualizadas;</li>
            <li>utilizar a plataforma de forma lícita e de boa-fé;</li>
            <li>não tentar violar, contornar ou comprometer a segurança do sistema.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">5. Disponibilidade</h2>
          <p>
            Empregamos esforços para manter a plataforma disponível e segura, mas pode haver indisponibilidade
            temporária por manutenção, falhas técnicas ou fatores externos.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">6. Privacidade e dados</h2>
          <p>
            O tratamento de dados pessoais segue a{" "}
            <Link href="/politica-de-privacidade" className="underline underline-offset-2 hover:text-foreground">
              Política de Privacidade
            </Link>
            . Ao usar a plataforma, você declara ciência dessas práticas.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">7. Alterações</h2>
          <p>
            As regras de agendamento seguem a política abaixo:
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li>a taxa de reserva funciona como sinal para confirmação do horário;</li>
            <li>no comparecimento à consulta, essa taxa é abatida do valor total;</li>
            <li>
              em cancelamentos com mais de 24h de antecedência, há reembolso
              integral da taxa de reserva;
            </li>
            <li>
              remarcações e cancelamentos automáticos são permitidos até 24h
              antes do horário agendado;
            </li>
            <li>
              com menos de 24h de antecedência, as opções automáticas de
              remarcação e cancelamento ficam bloqueadas, mantendo apenas contato
              via WhatsApp;
            </li>
            <li>
              é permitida 1 remarcação sem custo; a partir da segunda
              remarcação, há cobrança de nova taxa de reserva, sem abatimento no
              valor da consulta;
            </li>
            <li>
              em caso de não comparecimento (no-show), a taxa de reserva é
              retida, o agendamento é cancelado e uma nova reserva deve ser
              iniciada do zero.
            </li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">8. Alterações</h2>
          <p>
            Estes Termos podem ser atualizados periodicamente para refletir melhorias de produto,
            exigências legais e ajustes operacionais. A data de atualização será sempre exibida nesta página.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">9. Contato</h2>
          <p>
            Para dúvidas relacionadas a estes Termos, entre em contato pelo e-mail{" "}
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
