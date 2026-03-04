import { SignUp } from "@clerk/nextjs";
import type { Metadata } from "next";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { isClerkConfigured } from "@/lib/access";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default function SignUpPage() {
  if (!isClerkConfigured()) {
    return (
      <section className="mx-auto w-full max-w-lg">
        <Card>
          <CardHeader>
            <CardTitle>Cadastro indisponível</CardTitle>
            <CardDescription>
              Configure as variáveis do Clerk para habilitar o cadastro de pacientes.
            </CardDescription>
          </CardHeader>
        </Card>
      </section>
    );
  }

  return (
    <section className="mx-auto flex w-full max-w-lg justify-center">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Criar conta</CardTitle>
          <CardDescription>Cadastre-se para agendar sua consulta.</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <SignUp />
        </CardContent>
      </Card>
    </section>
  );
}
