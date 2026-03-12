"use client";

import { useState } from "react";
import { MailIcon, PhoneIcon, UnlinkIcon } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type PhoneLinkCardProps = {
  linked: boolean;
  maskedPhone?: string;
};

export function PhoneLinkCard({ linked: initialLinked, maskedPhone: initialMaskedPhone }: PhoneLinkCardProps) {
  const [linked, setLinked] = useState(initialLinked);
  const [maskedPhone, setMaskedPhone] = useState(initialMaskedPhone ?? "");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [phone, setPhone] = useState("");
  const [step, setStep] = useState<"input" | "sent">("input");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleRequestLink() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/phone-link/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone.replace(/\D/g, "") }),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.error ?? "Falha ao solicitar vinculação.");
        return;
      }
      setStep("sent");
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  async function handleRevoke() {
    setLoading(true);
    try {
      const res = await fetch("/api/phone-link/verify", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: maskedPhone }),
      });
      const data = await res.json();
      if (data.ok) {
        setLinked(false);
        setMaskedPhone("");
      }
    } catch {
      // silent fail
    } finally {
      setLoading(false);
    }
  }

  function handleDialogOpenChange(open: boolean) {
    setDialogOpen(open);
    if (!open) {
      setStep("input");
      setPhone("");
      setError("");
    }
  }

  function formatPhoneInput(value: string) {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 2) return digits;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }

  if (linked) {
    return (
      <Card>
        <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
          <CardTitle className="flex items-center gap-2 text-base">
            <PhoneIcon className="size-4" />
            WhatsApp
          </CardTitle>
          <Badge variant="outline" className="border-emerald-500/40 text-emerald-600 dark:text-emerald-400">
            Vinculado
          </Badge>
        </CardHeader>
        <CardContent className="flex items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">{maskedPhone}</p>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="sm" className="text-destructive">
                <UnlinkIcon className="mr-1.5 size-3.5" />
                Desvincular
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Desvincular WhatsApp?</AlertDialogTitle>
                <AlertDialogDescription>
                  A assistente virtual não poderá mais personalizar seu atendimento pelo WhatsApp.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleRevoke} disabled={loading} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Desvincular
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle className="flex items-center gap-2 text-base">
          <PhoneIcon className="size-4" />
          WhatsApp
        </CardTitle>
        <Badge variant="outline">Não vinculado</Badge>
      </CardHeader>
      <CardContent>
        <Dialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">Vincular WhatsApp</Button>
          </DialogTrigger>
          <DialogContent>
            {step === "input" ? (
              <>
                <DialogHeader>
                  <DialogTitle>Vincular WhatsApp</DialogTitle>
                  <DialogDescription>
                    Informe seu número de WhatsApp. Enviaremos um email de confirmação para o endereço cadastrado na sua conta.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-2">
                  <Label htmlFor="whatsapp-phone">Número de WhatsApp</Label>
                  <Input
                    id="whatsapp-phone"
                    placeholder="(85) 99999-9999"
                    value={phone}
                    onChange={(e) => setPhone(formatPhoneInput(e.target.value))}
                    maxLength={15}
                  />
                  {error && <p className="text-sm text-destructive">{error}</p>}
                </div>
                <DialogFooter>
                  <Button
                    onClick={handleRequestLink}
                    disabled={loading || phone.replace(/\D/g, "").length < 10}
                  >
                    {loading ? "Enviando..." : "Enviar verificação"}
                  </Button>
                </DialogFooter>
              </>
            ) : (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <MailIcon className="size-5" />
                    Email enviado!
                  </DialogTitle>
                  <DialogDescription>
                    Enviamos um email para o endereço cadastrado na sua conta. Clique no botão
                    &quot;Confirmar meu número&quot; no email para completar a vinculação.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="outline" onClick={() => handleDialogOpenChange(false)}>
                    Entendi
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
