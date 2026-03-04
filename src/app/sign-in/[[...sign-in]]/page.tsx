import { SignIn } from "@clerk/nextjs";
import type { Metadata } from "next";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { isClerkConfigured } from "@/lib/access";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default function SignInPage() {
  if (!isClerkConfigured()) {
    return (
      <section className="mx-auto w-full max-w-lg">
        <Card>
          <CardHeader>
            <CardTitle>Autenticação indisponível</CardTitle>
            <CardDescription>
              Configure as variáveis do Clerk para acessar a área exclusiva do paciente.
            </CardDescription>
          </CardHeader>
        </Card>
      </section>
    );
  }

  return (
    <section className="relative mx-auto flex w-full max-w-5xl justify-center pt-2 md:pt-6">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-72 bg-[radial-gradient(circle_at_top,rgba(120,148,255,0.18),transparent_58%)] blur-2xl" />

      <Card className="w-full max-w-4xl rounded-3xl border-white/10 bg-linear-to-br from-card/95 via-card/90 to-card/65 backdrop-blur-2xl">
        <CardHeader className="space-y-3">
          <p className="text-sm text-muted-foreground">Área exclusiva do paciente</p>
          <CardTitle className="text-3xl tracking-tight md:text-4xl">Entrar</CardTitle>
          <CardDescription className="max-w-2xl text-sm text-muted-foreground md:text-base">
            Acesse sua conta para acompanhar e organizar seus agendamentos.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center pb-8">
          <SignIn
            path="/sign-in"
            routing="path"
            signUpUrl="/sign-up"
            appearance={{
              elements: {
                rootBox: "w-full",
                card: "w-full max-w-xl border border-border/70 bg-background/90 shadow-none rounded-2xl",
                headerTitle: "text-foreground text-xl",
                headerSubtitle: "text-muted-foreground",
                socialButtonsBlockButton:
                  "rounded-xl border-border/70 bg-card text-foreground hover:bg-muted transition-colors",
                dividerLine: "bg-border/70",
                dividerText: "text-muted-foreground",
                formFieldLabel: "text-foreground",
                formFieldInput:
                  "rounded-xl border-input bg-background text-foreground shadow-none focus-visible:ring-2 focus-visible:ring-ring",
                formButtonPrimary:
                  "rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 shadow-none",
                footerActionText: "text-muted-foreground",
                footerActionLink: "text-primary hover:text-primary/90",
                identityPreviewText: "text-foreground",
                identityPreviewEditButton: "text-primary hover:text-primary/90",
              },
            }}
          />
        </CardContent>
      </Card>
    </section>
  );
}
