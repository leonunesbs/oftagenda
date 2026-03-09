"use client";

import { useEffect, useMemo, useState } from "react";
import { GoogleTagManager } from "@next/third-parties/google";
import Link from "next/link";
import Script from "next/script";

import { Button } from "@/components/ui/button";
import { trackEvent } from "@/lib/analytics";
import { clientEnv } from "@/lib/env/client";

const CONSENT_KEY = "oftcore:consent:v1";

type ConsentValue = "granted" | "denied";

function readConsent(): ConsentValue | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const value = window.localStorage.getItem(CONSENT_KEY);
    if (value === "granted" || value === "denied") {
      return value;
    }
  } catch {
    // Some browsers/privacy contexts can block localStorage access.
    if (window.__oftConsent === "granted" || window.__oftConsent === "denied") {
      return window.__oftConsent;
    }
  }
  return null;
}

function hasPii(value: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value) || /^\d{2}:\d{2}$/.test(value)) {
    return false;
  }

  const digitsOnly = value.replace(/\D/g, "");
  const looksLikePhone = digitsOnly.length >= 10 && digitsOnly.length <= 15;

  return (
    /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(value) ||
    looksLikePhone
  );
}

export function AnalyticsConsent() {
  const [consent, setConsent] = useState<ConsentValue | null>(null);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const savedConsent = readConsent();
    setConsent(savedConsent);
    if (savedConsent) {
      window.__oftConsent = savedConsent;
      return;
    }

    let timeoutId: number | null = null;
    let idleId: number | null = null;

    const revealBanner = () => {
      setShowBanner(true);
    };

    const scheduleReveal = () => {
      if ("requestIdleCallback" in window) {
        idleId = window.requestIdleCallback(revealBanner, { timeout: 1500 });
      } else {
        timeoutId = window.setTimeout(revealBanner, 250);
      }
    };

    if (document.readyState === "complete") {
      scheduleReveal();
    } else {
      const onLoad = () => {
        scheduleReveal();
      };
      window.addEventListener("load", onLoad, { once: true });
      return () => {
        window.removeEventListener("load", onLoad);
        if (timeoutId !== null) {
          window.clearTimeout(timeoutId);
        }
        if (idleId !== null && "cancelIdleCallback" in window) {
          window.cancelIdleCallback(idleId);
        }
      };
    }

    return () => {
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
      if (idleId !== null && "cancelIdleCallback" in window) {
        window.cancelIdleCallback(idleId);
      }
    };
  }, []);

  useEffect(() => {
    const url = new URL(window.location.href);
    const keysToRemove: string[] = [];
    url.searchParams.forEach((value, key) => {
      if (hasPii(value) || /email|phone|telefone|celular|nome/i.test(key)) {
        keysToRemove.push(key);
      }
    });
    if (keysToRemove.length > 0) {
      for (const key of keysToRemove) {
        url.searchParams.delete(key);
      }
      const sanitizedUrl = `${url.pathname}${url.search}${url.hash}`;
      window.history.replaceState({}, "", sanitizedUrl);
    }
  }, []);

  const ga4Id = clientEnv.NEXT_PUBLIC_GA4_ID;
  const gtmId = clientEnv.NEXT_PUBLIC_GTM_ID;
  const metaPixelId = clientEnv.NEXT_PUBLIC_META_PIXEL_ID;
  const googleAdsId = clientEnv.NEXT_PUBLIC_GOOGLE_ADS_ID;
  const shouldLoadScripts = consent === "granted";

  const hasAnyTrackingId = useMemo(
    () => Boolean(ga4Id || gtmId || metaPixelId || googleAdsId),
    [ga4Id, gtmId, metaPixelId, googleAdsId],
  );

  function updateConsent(nextConsent: ConsentValue) {
    try {
      window.localStorage.setItem(CONSENT_KEY, nextConsent);
    } catch {
      // In restricted contexts (e.g., embedded third-party iframes), keep runtime consent in memory.
    }
    window.__oftConsent = nextConsent;
    setConsent(nextConsent);
    if (nextConsent === "granted") {
      // Trigger the first pageview right after consent is granted.
      window.setTimeout(() => {
        trackEvent("view_content", { path: window.location.pathname });
      }, 0);
    }
  }

  if (!hasAnyTrackingId) {
    return null;
  }

  return (
    <>
      {shouldLoadScripts && gtmId && process.env.NODE_ENV === "production" ? (
        <GoogleTagManager gtmId={gtmId} />
      ) : null}

      {shouldLoadScripts && ga4Id ? (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${ga4Id}`}
            strategy="afterInteractive"
          />
          <Script id="ga4-config" strategy="afterInteractive">
            {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
window.gtag = gtag;
gtag('js', new Date());
gtag('config', '${ga4Id}', { anonymize_ip: true });`}
          </Script>
        </>
      ) : null}

      {shouldLoadScripts && metaPixelId ? (
        <Script id="meta-pixel" strategy="afterInteractive">
          {`!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${metaPixelId}');
fbq('track', 'PageView');`}
        </Script>
      ) : null}

      {shouldLoadScripts && googleAdsId ? (
        <Script id="google-ads-config" strategy="afterInteractive">
          {`window.dataLayer = window.dataLayer || [];
window.gtag = window.gtag || function(){window.dataLayer.push(arguments);};
window.gtag('config', '${googleAdsId}');`}
        </Script>
      ) : null}

      {showBanner && consent === null ? (
        <div className="fixed inset-x-0 bottom-4 z-50 mx-auto w-[min(760px,95vw)] rounded-2xl border border-border/70 bg-background/95 p-4 shadow-xl backdrop-blur md:p-5">
          <p className="text-sm font-semibold text-foreground">Sua privacidade em primeiro lugar</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Usamos cookies opcionais para entender o que funciona melhor e melhorar seu agendamento.
            Se preferir, você pode continuar apenas com os cookies essenciais sem impactar as funções
            principais.
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Saiba mais em{" "}
            <Link
              href="/politica-de-privacidade"
              className="underline underline-offset-2 hover:text-foreground"
            >
              Política de Privacidade
            </Link>
            .
          </p>
          <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => updateConsent("denied")}
              className="w-full sm:w-auto"
            >
              Apenas essenciais
            </Button>
            <Button type="button" onClick={() => updateConsent("granted")} className="w-full sm:w-auto">
              Aceitar e continuar
            </Button>
          </div>
        </div>
      ) : null}
    </>
  );
}

