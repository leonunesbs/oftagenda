import { SignIn } from "@clerk/nextjs";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { isClerkConfigured } from "@/lib/access";

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
    <section className="mx-auto flex w-full max-w-lg justify-center">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Entrar</CardTitle>
          <CardDescription>Acesse sua área exclusiva do paciente.</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <SignIn />
        </CardContent>
      </Card>
    </section>
  );
}
