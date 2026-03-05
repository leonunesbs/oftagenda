"use client";

import { useEffect, useMemo, useState } from "react";
import { GoogleTagManager } from "@next/third-parties/google";
import Script from "next/script";

import { Button } from "@/components/ui/button";
import { clientEnv } from "@/lib/env/client";

const CONSENT_KEY = "oftcore:consent:v1";

type ConsentValue = "granted" | "denied";

function readConsent(): ConsentValue | null {
  if (typeof window === "undefined") {
    return null;
  }
  const value = window.localStorage.getItem(CONSENT_KEY);
  if (value === "granted" || value === "denied") {
    return value;
  }
  return null;
}

function hasPii(value: string) {
  return (
    /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(value) ||
    /\+?\d[\d\s().-]{7,}\d/.test(value)
  );
}

export function AnalyticsConsent() {
  const [consent, setConsent] = useState<ConsentValue | null>(null);

  useEffect(() => {
    setConsent(readConsent());
  }, []);

  useEffect(() => {
    const url = new URL(window.location.href);
    let changed = false;
    url.searchParams.forEach((value, key) => {
      if (hasPii(value) || /email|phone|telefone|celular|nome/i.test(key)) {
        url.searchParams.set(key, "[redacted]");
        changed = true;
      }
    });
    if (changed) {
      window.history.replaceState({}, "", url.toString());
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
    window.localStorage.setItem(CONSENT_KEY, nextConsent);
    setConsent(nextConsent);
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
          {`window.gtag = window.gtag || function(){window.dataLayer.push(arguments);};
window.gtag('config', '${googleAdsId}');`}
        </Script>
      ) : null}

      {consent === null ? (
        <div className="fixed inset-x-0 bottom-4 z-50 mx-auto w-[min(720px,95vw)] rounded-xl border border-border/70 bg-background/95 p-4 shadow-lg backdrop-blur">
          <p className="text-sm text-muted-foreground">
            Usamos cookies para mensurar performance e melhorar sua experiência. Você pode aceitar
            ou recusar rastreamento não essencial.
          </p>
          <div className="mt-3 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => updateConsent("denied")}>
              Recusar
            </Button>
            <Button type="button" onClick={() => updateConsent("granted")}>
              Aceitar
            </Button>
          </div>
        </div>
      ) : null}
    </>
  );
}

