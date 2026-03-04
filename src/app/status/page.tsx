import { auth } from "@clerk/nextjs/server";
import { api } from "@convex/_generated/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getConvexHttpClient, getAuthenticatedConvexHttpClient, resolveConvexUrl } from "@/lib/convex-server";
import { isClerkConfigured } from "@/lib/access";
import { headers } from "next/headers";

type CheckStatus = "ok" | "warning" | "error";

type ServiceCheck = {
  name: string;
  status: CheckStatus;
  detail: string;
  extra?: string;
};

function renderStatusLabel(status: CheckStatus) {
  if (status === "ok") {
    return "OK";
  }
  if (status === "warning") {
    return "Atenção";
  }
  return "Erro";
}

function statusClassName(status: CheckStatus) {
  if (status === "ok") {
    return "border-emerald-600/40 bg-emerald-600/10 text-emerald-300";
  }
  if (status === "warning") {
    return "border-amber-600/40 bg-amber-600/10 text-amber-300";
  }
  return "border-red-600/40 bg-red-600/10 text-red-300";
}

function formatErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }
  return "Erro desconhecido";
}

function sanitizeHostname(rawUrl: string) {
  try {
    return new URL(rawUrl).host;
  } catch {
    return "url-invalida";
  }
}

async function probeUrl(url: string) {
  const response = await fetch(url, {
    method: "GET",
    cache: "no-store",
    signal: AbortSignal.timeout(4000),
  });
  return response.status;
}

export default async function StatusPage() {
  const checks: ServiceCheck[] = [];
  const envChecks: ServiceCheck[] = [];
  const now = new Date();

  const clerkEnabled = isClerkConfigured();
  envChecks.push({
    name: "Clerk chaves essenciais",
    status: clerkEnabled ? "ok" : "error",
    detail: clerkEnabled
      ? "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY e CLERK_SECRET_KEY definidos."
      : "Clerk não configurado corretamente no ambiente.",
  });

  const hasConvexDeployment = Boolean(process.env.CONVEX_DEPLOYMENT);
  envChecks.push({
    name: "Convex deployment",
    status: hasConvexDeployment ? "ok" : "warning",
    detail: hasConvexDeployment
      ? "CONVEX_DEPLOYMENT definido."
      : "CONVEX_DEPLOYMENT ausente (aceitável localmente, mas recomendado).",
  });

  let convexUrl = "";
  try {
    convexUrl = resolveConvexUrl();
    envChecks.push({
      name: "Convex URL resolvida",
      status: "ok",
      detail: `Usando endpoint ${sanitizeHostname(convexUrl)}.`,
    });
  } catch (error) {
    envChecks.push({
      name: "Convex URL resolvida",
      status: "error",
      detail: formatErrorMessage(error),
    });
  }

  if (convexUrl) {
    try {
      const client = getConvexHttpClient();
      await client.query(api.appointments.getActiveBookingLocations, {});
      checks.push({
        name: "Convex query pública",
        status: "ok",
        detail: "Conexão com Convex Cloud funcionando para leitura pública.",
      });
    } catch (error) {
      checks.push({
        name: "Convex query pública",
        status: "error",
        detail: formatErrorMessage(error),
      });
    }
  } else {
    checks.push({
      name: "Convex query pública",
      status: "error",
      detail: "Teste ignorado porque a URL do Convex não foi resolvida.",
    });
  }

  const convexSiteUrl = process.env.NEXT_PUBLIC_CONVEX_SITE_URL;
  if (convexSiteUrl) {
    try {
      const statusCode = await probeUrl(convexSiteUrl);
      checks.push({
        name: "Convex site URL",
        status: statusCode < 500 ? "ok" : "warning",
        detail: `Endpoint respondeu com HTTP ${statusCode}.`,
        extra: sanitizeHostname(convexSiteUrl),
      });
    } catch (error) {
      checks.push({
        name: "Convex site URL",
        status: "warning",
        detail: `Falha no probe HTTP: ${formatErrorMessage(error)}`,
        extra: sanitizeHostname(convexSiteUrl),
      });
    }
  } else {
    checks.push({
      name: "Convex site URL",
      status: "warning",
      detail: "NEXT_PUBLIC_CONVEX_SITE_URL não definida.",
    });
  }

  const authData = clerkEnabled ? await auth() : null;
  const isAuthenticated = Boolean(authData?.userId);
  checks.push({
    name: "Sessão Clerk",
    status: clerkEnabled ? (isAuthenticated ? "ok" : "warning") : "error",
    detail: !clerkEnabled
      ? "Clerk está desativado por configuração."
      : isAuthenticated
        ? "Usuário autenticado."
        : "Sem usuário autenticado na sessão atual.",
  });

  if (clerkEnabled && authData) {
    try {
      const token = await authData.getToken({ template: "convex" });
      checks.push({
        name: "Token Clerk template convex",
        status: token ? "ok" : "error",
        detail: token
          ? "Template convex gerou JWT com sucesso."
          : "Template convex não retornou token.",
      });
    } catch (error) {
      checks.push({
        name: "Token Clerk template convex",
        status: "error",
        detail: formatErrorMessage(error),
      });
    }
  }

  if (clerkEnabled && isAuthenticated) {
    try {
      const { client } = await getAuthenticatedConvexHttpClient();
      await client.query(api.appointments.getDashboardState, {});
      checks.push({
        name: "Convex query autenticada",
        status: "ok",
        detail: "JWT Clerk está aceito no Convex para queries autenticadas.",
      });
    } catch (error) {
      checks.push({
        name: "Convex query autenticada",
        status: "error",
        detail: formatErrorMessage(error),
      });
    }

    try {
      const { client } = await getAuthenticatedConvexHttpClient();
      await client.query(api.admin.getManagementSnapshot, {});
      checks.push({
        name: "Convex admin snapshot",
        status: "ok",
        detail: "Acesso administrativo no Convex disponível para esta sessão.",
      });
    } catch (error) {
      const message = formatErrorMessage(error);
      const isNotAuthorized = message.toLowerCase().includes("not authorized");
      checks.push({
        name: "Convex admin snapshot",
        status: isNotAuthorized ? "warning" : "error",
        detail: isNotAuthorized
          ? "Sessão autenticada, mas sem claim admin no JWT do Convex. Verifique template `convex` no Clerk (public_metadata.role)."
          : message,
      });
    }
  } else {
    checks.push({
      name: "Convex query autenticada",
      status: "warning",
      detail: "Teste exige usuário autenticado.",
    });
    checks.push({
      name: "Convex admin snapshot",
      status: "warning",
      detail: "Teste exige usuário autenticado com permissão administrativa.",
    });
  }

  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "http";
  const cookieHeader = requestHeaders.get("cookie") ?? "";
  const origin = host ? `${protocol}://${host}` : null;

  if (origin) {
    try {
      const response = await fetch(`${origin}/api/booking/locations`, {
        method: "GET",
        headers: cookieHeader ? { cookie: cookieHeader } : undefined,
        cache: "no-store",
        signal: AbortSignal.timeout(5000),
      });
      checks.push({
        name: "API /booking/locations",
        status: response.ok ? "ok" : response.status === 401 || response.status === 403 ? "warning" : "error",
        detail: `HTTP ${response.status} no endpoint interno.`,
      });
    } catch (error) {
      checks.push({
        name: "API /booking/locations",
        status: "error",
        detail: formatErrorMessage(error),
      });
    }

    try {
      const response = await fetch(`${origin}/api/booking/options?location=fortaleza&daysAhead=7`, {
        method: "GET",
        headers: cookieHeader ? { cookie: cookieHeader } : undefined,
        cache: "no-store",
        signal: AbortSignal.timeout(5000),
      });
      checks.push({
        name: "API /booking/options",
        status: response.ok ? "ok" : response.status === 401 || response.status === 403 ? "warning" : "error",
        detail: `HTTP ${response.status} no endpoint interno.`,
      });
    } catch (error) {
      checks.push({
        name: "API /booking/options",
        status: "error",
        detail: formatErrorMessage(error),
      });
    }
  } else {
    checks.push({
      name: "APIs internas",
      status: "warning",
      detail: "Host da requisição indisponível para testes internos.",
    });
  }

  const checkTotals = checks.reduce(
    (acc, check) => {
      acc[check.status] += 1;
      return acc;
    },
    { ok: 0, warning: 0, error: 0 },
  );

  return (
    <section className="mx-auto w-full max-w-5xl space-y-6">
      <Card className="border-border/70">
        <CardHeader>
          <CardTitle>Status detalhado de conexões</CardTitle>
          <CardDescription>
            Diagnóstico em tempo real do site, Convex, Clerk e APIs internas.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm text-muted-foreground md:grid-cols-2">
          <p>Atualizado em: {now.toLocaleString("pt-BR")}</p>
          <p>Ambiente: {process.env.NODE_ENV}</p>
          <p>Checks OK: {checkTotals.ok}</p>
          <p>Checks em atenção: {checkTotals.warning}</p>
          <p>Checks com erro: {checkTotals.error}</p>
        </CardContent>
      </Card>

      <Card className="border-border/70">
        <CardHeader>
          <CardTitle>Configuração de ambiente</CardTitle>
          <CardDescription>Validação das variáveis críticas para autenticação e backend.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {envChecks.map((check) => (
            <div key={check.name} className="rounded-lg border border-border/70 p-3">
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="font-medium">{check.name}</p>
                <span className={`rounded-full border px-2 py-0.5 text-xs ${statusClassName(check.status)}`}>
                  {renderStatusLabel(check.status)}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">{check.detail}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="border-border/70">
        <CardHeader>
          <CardTitle>Serviços e endpoints</CardTitle>
          <CardDescription>Saúde da integração entre aplicação, Convex, Clerk e rotas internas.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {checks.map((check) => (
            <div key={check.name} className="rounded-lg border border-border/70 p-3">
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="font-medium">{check.name}</p>
                <span className={`rounded-full border px-2 py-0.5 text-xs ${statusClassName(check.status)}`}>
                  {renderStatusLabel(check.status)}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">{check.detail}</p>
              {check.extra ? <p className="mt-1 text-xs text-muted-foreground/80">{check.extra}</p> : null}
            </div>
          ))}
        </CardContent>
      </Card>
    </section>
  );
}
