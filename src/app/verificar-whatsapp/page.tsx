import type { Metadata } from "next";
import Link from "next/link";
import { CircleCheckIcon, CircleXIcon } from "lucide-react";

import { api } from "@convex/_generated/api";
import { getConvexHttpClient } from "@/lib/convex-server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Verificar WhatsApp",
  robots: { index: false, follow: false },
};

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function VerificarWhatsAppPage({ searchParams }: Props) {
  const params = await searchParams;
  const token = typeof params.token === "string" ? params.token : "";

  if (!token) {
    return <ResultCard success={false} message="Link de verificação inválido." />;
  }

  try {
    const client = getConvexHttpClient();
    await client.mutation(api.phoneLinks.confirmPhoneLink, { token });
    return <ResultCard success message="Seu WhatsApp foi vinculado com sucesso!" />;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Não foi possível confirmar a vinculação.";
    return <ResultCard success={false} message={message} />;
  }
}

function ResultCard({ success, message }: { success: boolean; message: string }) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm text-center">
        <CardHeader className="items-center gap-3 pb-2">
          {success ? (
            <CircleCheckIcon className="size-12 text-emerald-500" />
          ) : (
            <CircleXIcon className="size-12 text-destructive" />
          )}
          <CardTitle className="text-lg">
            {success ? "WhatsApp vinculado!" : "Falha na verificação"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{message}</p>
          {success && (
            <p className="mt-3 text-sm text-muted-foreground">
              Pode voltar ao chat. A Lux já reconhece você.
            </p>
          )}
        </CardContent>
        <CardFooter className="justify-center">
          {success ? (
            <Button asChild>
              <Link href="/dashboard">Ir para o painel</Link>
            </Button>
          ) : (
            <Button variant="outline" asChild>
              <Link href="/dashboard">Ir para o painel</Link>
            </Button>
          )}
        </CardFooter>
      </Card>
    </main>
  );
}
