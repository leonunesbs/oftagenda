import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { isClerkConfigured } from "@/lib/access";

const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/agendar(.*)",
  "/detalhes(.*)",
  "/api/(.*)",
]);

const clerkConfigured = isClerkConfigured();
const siteUnderConstruction =
  process.env.NEXT_PUBLIC_SITE_UNDER_CONSTRUCTION === "true";

function renderUnderConstructionPage(appName: string, returnUrl: string) {
  return `<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${appName} | Em construcao</title>
    <style>
      :root {
        color-scheme: dark;
      }
      * {
        box-sizing: border-box;
      }
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        background: radial-gradient(circle at top, #1f2937 0%, #0b0b0f 60%, #050506 100%);
        color: #f5f5f5;
        font-family: Inter, "Geist", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        padding: 1.25rem;
      }
      .card {
        width: min(42rem, 100%);
        border: 1px solid rgba(255, 255, 255, 0.15);
        background: rgba(18, 18, 24, 0.86);
        backdrop-filter: blur(10px);
        border-radius: 1rem;
        padding: 2rem;
        box-shadow: 0 12px 40px rgba(0, 0, 0, 0.4);
      }
      .eyebrow {
        display: inline-flex;
        padding: 0.375rem 0.75rem;
        border-radius: 999px;
        border: 1px solid rgba(255, 255, 255, 0.2);
        font-size: 0.8rem;
        color: #e5e7eb;
      }
      h1 {
        margin: 1rem 0 0.75rem;
        font-size: clamp(1.6rem, 2.2vw, 2.2rem);
        line-height: 1.2;
      }
      p {
        margin: 0;
        color: #d1d5db;
        line-height: 1.65;
      }
      .actions {
        margin-top: 1.5rem;
      }
      a {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border-radius: 0.75rem;
        border: 1px solid rgba(255, 255, 255, 0.2);
        text-decoration: none;
        color: #fafafa;
        background: rgba(255, 255, 255, 0.08);
        font-weight: 600;
        padding: 0.7rem 1rem;
      }
      a:hover {
        background: rgba(255, 255, 255, 0.14);
      }
    </style>
  </head>
  <body>
    <main class="card">
      <span class="eyebrow">Aviso importante</span>
      <h1>${appName} esta em construcao</h1>
      <p>Estamos realizando ajustes finais para entregar uma experiencia melhor. Em breve, esta pagina estara disponivel novamente.</p>
      <div class="actions">
        <a href="${returnUrl}">Voltar ao site principal</a>
      </div>
    </main>
  </body>
</html>`;
}

const proxy = clerkConfigured
  ? clerkMiddleware(async (auth, req) => {
      const pathname = req.nextUrl.pathname;
      if (siteUnderConstruction && !pathname.startsWith("/api/")) {
        return new NextResponse(
          renderUnderConstructionPage("Minha Agenda", "https://oftleonardo.com.br"),
          {
            status: 503,
            headers: {
              "content-type": "text/html; charset=utf-8",
              "cache-control": "no-store, no-cache, must-revalidate",
              pragma: "no-cache",
            },
          },
        );
      }
      if (
        pathname === "/api/stripe/webhook" ||
        pathname.startsWith("/api/integrations/n8n/")
      ) {
        return;
      }
      if (isProtectedRoute(req)) {
        await auth.protect();
      }
    })
  : (req: Request) => {
      const pathname = new URL(req.url).pathname;
      if (siteUnderConstruction && !pathname.startsWith("/api/")) {
        return new NextResponse(
          renderUnderConstructionPage("Minha Agenda", "https://oftleonardo.com.br"),
          {
            status: 503,
            headers: {
              "content-type": "text/html; charset=utf-8",
              "cache-control": "no-store, no-cache, must-revalidate",
              pragma: "no-cache",
            },
          },
        );
      }
      return NextResponse.next();
    };

export default proxy;

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
