import "./globals.css";

import { ClerkProvider } from "@clerk/nextjs";
import { Geist, Inter } from "next/font/google";

import { AppHeader } from "@/components/app-header";
import { ConvexClientProvider } from "@/components/convex-client-provider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { isClerkConfigured } from "@/lib/access";
import type { Metadata } from "next";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Minha Agenda",
  description: "Agendamento primeiro. Detalhes depois.",
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
        {clerkEnabled ? (
          <ClerkProvider>
            <ConvexClientProvider>
              <TooltipProvider>
                <div className="min-h-screen bg-background">
                  <AppHeader clerkEnabled />
                  <main className="mx-auto w-full max-w-5xl px-4 py-10 md:px-6 md:py-14">{children}</main>
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
              <Toaster />
            </div>
          </TooltipProvider>
        )}
      </body>
    </html>
  );
}
