import "./globals.css";

import Link from "next/link";

import { AnalyticsConsent } from "@/components/analytics-consent";
import { AnalyticsPageview } from "@/components/analytics-pageview";
import { AppHeader } from "@/components/app-header";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { isClerkConfigured } from "@/lib/access";
import { resolveSiteUrl, siteConfig } from "@/config/site";
import type { Metadata } from "next";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { cn } from "@/lib/utils";

const metadataBase = resolveSiteUrl();

const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: siteConfig.name,
  url: metadataBase.toString(),
  description: siteConfig.description,
  inLanguage: "pt-BR",
};

const medicalClinicSchema = {
  "@context": "https://schema.org",
  "@type": "MedicalClinic",
  name: siteConfig.name,
  url: metadataBase.toString(),
  medicalSpecialty: ["Ophthalmology"],
  sameAs: [siteConfig.social.instagram, siteConfig.social.oftleonardoSite],
};

export const metadata: Metadata = {
  metadataBase,
  title: {
    default: "Minha Agenda | Agendamento Oftalmologico Premium",
    template: "%s | Minha Agenda",
  },
  description: siteConfig.description,
  keywords: [...siteConfig.keywords],
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: siteConfig.name,
    title: "Minha Agenda | Agendamento oftalmologico simplificado",
    description: siteConfig.description,
    url: "/",
    images: [
      {
        url: siteConfig.ogImage,
        width: 1200,
        height: 630,
        alt: "Minha Agenda - plataforma de agendamento oftalmologico",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Minha Agenda | Agendamento oftalmologico simplificado",
    description: siteConfig.description,
    images: [siteConfig.ogImage],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const clerkEnabled = isClerkConfigured();
  const legalFooter = (
    <footer data-app-legal-footer className="mx-auto w-full max-w-5xl px-4 pb-8 pt-2 text-xs text-foreground/80 md:px-6">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border/70 pt-4">
        <span className="text-[11px] tracking-wide text-foreground/80">Plataforma oficial de Leonardo Nunes</span>
        <Link href="/termos-de-uso" className="underline underline-offset-2 hover:text-foreground">
          Termos de Uso
        </Link>
        <Link href="/politica-de-privacidade" className="underline underline-offset-2 hover:text-foreground">
          Política de Privacidade
        </Link>
      </div>
    </footer>
  );

  return (
    <html lang="pt-BR" className={cn("dark", "font-sans")}>
      <body>
        <NuqsAdapter>
          <script
            id="website-schema"
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify(websiteSchema),
            }}
          />
          <script
            id="medical-clinic-schema"
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify(medicalClinicSchema),
            }}
          />
          <TooltipProvider>
            <div className="flex min-h-screen flex-col bg-background">
              <AppHeader clerkEnabled={clerkEnabled} />
              <main data-app-main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 md:px-6 md:py-14">
                {children}
              </main>
              {legalFooter}
              <AnalyticsPageview />
              <AnalyticsConsent />
              <Toaster />
            </div>
          </TooltipProvider>
        </NuqsAdapter>
      </body>
    </html>
  );
}
