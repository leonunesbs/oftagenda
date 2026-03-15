import "./globals.css";

import Link from "next/link";
import { Noto_Sans } from "next/font/google";
import { auth } from "@clerk/nextjs/server";
import { GoogleTagManager } from "@next/third-parties/google";
import { cookies } from "next/headers";

import { AppHeader } from "@/components/app-header";
import { AnalyticsConsent } from "@/components/analytics-consent";
import { AnalyticsPageview } from "@/components/analytics-pageview";
import type { SessionState } from "@/components/header-auth-button";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { isClerkConfigured } from "@/lib/access";
import { resolveSiteUrl, siteConfig } from "@/config/site";
import type { Metadata } from "next";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { cn } from "@/lib/utils";

const notoSans = Noto_Sans({
  subsets: ["latin"],
  display: "optional",
  preload: true,
  fallback: ["system-ui", "Segoe UI", "Helvetica Neue", "Arial", "sans-serif"],
  adjustFontFallback: true,
  variable: "--font-sans",
});

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

const loggedOutHeaderState: SessionState = {
  isAuthenticated: false,
  userId: null,
  avatarUrl: null,
  firstName: null,
};

const THEME_COOKIE_NAME = "oftagenda-theme";

async function getHeaderSessionState(clerkEnabled: boolean): Promise<SessionState> {
  if (!clerkEnabled) {
    return loggedOutHeaderState;
  }

  try {
    const { getToken, sessionClaims } = await auth();
    const token = await getToken();

    if (!token) {
      return loggedOutHeaderState;
    }

    const claims =
      sessionClaims && typeof sessionClaims === "object"
        ? (sessionClaims as Record<string, unknown>)
        : {};

    const userId = typeof claims.sub === "string" ? claims.sub : null;
    const firstName =
      typeof claims.given_name === "string"
        ? claims.given_name
        : typeof claims.first_name === "string"
          ? claims.first_name
          : null;
    const avatarUrl =
      typeof claims.picture === "string"
        ? claims.picture
        : typeof claims.image_url === "string"
          ? claims.image_url
          : null;

    return {
      isAuthenticated: true,
      userId,
      avatarUrl,
      firstName,
    };
  } catch {
    return loggedOutHeaderState;
  }
}

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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const clerkEnabled = isClerkConfigured();
  const gtmId = process.env.NEXT_PUBLIC_GTM_ID;
  const shouldLoadGtm = process.env.NODE_ENV === "production" && Boolean(gtmId);
  const sessionState = await getHeaderSessionState(clerkEnabled);
  const cookieStore = await cookies();
  const persistedTheme = cookieStore.get(THEME_COOKIE_NAME)?.value;
  const initialThemeClass = persistedTheme === "dark" ? "dark" : undefined;
  const legalFooter = (
    <footer data-app-legal-footer className="mx-auto w-full max-w-5xl px-4 pb-8 pt-2 text-xs text-muted-foreground md:px-6">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border/70 pt-4">
        <span className="text-[11px] tracking-wide text-muted-foreground">Plataforma oficial de Leonardo Nunes</span>
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
    <html lang="pt-BR" className={cn("font-sans", notoSans.variable, initialThemeClass)}>
      <body>
        <script
          id="gtm-consent-bootstrap"
          dangerouslySetInnerHTML={{
            __html: `window.dataLayer=window.dataLayer||[];function gtag(){window.dataLayer.push(arguments);}window.gtag=gtag;gtag('consent','default',{ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',analytics_storage:'denied',wait_for_update:500});`,
          }}
        />
        {shouldLoadGtm ? <GoogleTagManager gtmId={gtmId!} /> : null}
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
              <AppHeader clerkEnabled={clerkEnabled} sessionState={sessionState} />
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
