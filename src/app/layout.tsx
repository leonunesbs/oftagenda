import "./globals.css";

import { ClerkProvider } from "@clerk/nextjs";
import { Geist, Inter } from "next/font/google";

import { AnalyticsConsent } from "@/components/analytics-consent";
import { AnalyticsPageview } from "@/components/analytics-pageview";
import { AppHeader } from "@/components/app-header";
import { ConvexClientProvider } from "@/components/convex-client-provider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { isClerkConfigured } from "@/lib/access";
import { resolveSiteUrl, siteConfig } from "@/config/site";
import type { Metadata } from "next";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
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

  return (
    <html lang="pt-BR" className={`${inter.variable} dark`}>
      <body className={geistSans.variable}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify([websiteSchema, medicalClinicSchema]),
          }}
        />
        {clerkEnabled ? (
          <ClerkProvider>
            <ConvexClientProvider>
              <TooltipProvider>
                <div className="min-h-screen bg-background">
                  <AppHeader clerkEnabled />
                  <main className="mx-auto w-full max-w-5xl px-4 py-10 md:px-6 md:py-14">{children}</main>
                  <AnalyticsPageview />
                  <AnalyticsConsent />
                  <Toaster />
                </div>
              </TooltipProvider>
            </ConvexClientProvider>
          </ClerkProvider>
        ) : (
          <TooltipProvider>
            <div className="min-h-screen bg-background">
              <AppHeader clerkEnabled={false} />
              <main className="mx-auto w-full max-w-5xl px-4 py-10 md:px-6 md:py-14">{children}</main>
              <AnalyticsPageview />
              <AnalyticsConsent />
              <Toaster />
            </div>
          </TooltipProvider>
        )}
      </body>
    </html>
  );
}
