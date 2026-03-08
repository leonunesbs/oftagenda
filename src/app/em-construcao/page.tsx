import Link from "next/link";

import { siteConfig } from "@/config/site";

export default function UnderConstructionPage() {
  return (
    <main className="grid h-screen place-items-center bg-[radial-gradient(circle_at_top,#1f2937_0%,#0b0b0f_60%,#050506_100%)] px-5 text-foreground">
      <section className="w-full max-w-2xl rounded-2xl border border-white/15 bg-[rgba(18,18,24,0.86)] p-8 text-white shadow-[0_12px_40px_rgba(0,0,0,0.4)] backdrop-blur-sm">
        <span className="inline-flex rounded-full border border-white/20 px-3 py-1 text-xs text-slate-200">
          Aviso importante
        </span>
        <h1 className="mt-4 text-3xl font-semibold leading-tight md:text-4xl">
          Minha Agenda está em construção
        </h1>
        <p className="mt-3 text-base leading-relaxed text-slate-300">
          Estamos realizando ajustes finais para entregar uma experiência
          melhor. Em breve, esta página estará disponível novamente.
        </p>
        <div className="mt-6">
          <Link
            href={siteConfig.social.oftleonardoSite}
            className="inline-flex items-center justify-center rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 font-semibold text-white transition-colors hover:bg-white/15"
          >
            Voltar ao site principal
          </Link>
        </div>
      </section>
    </main>
  );
}
