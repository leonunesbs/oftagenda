export const siteConfig = {
  name: "Minha Agenda",
  shortName: "Minha Agenda",
  domain: "agenda.oftleonardo.com.br",
  canonical: "https://agenda.oftleonardo.com.br",
  description:
    "Plataforma de agendamento oftalmológico com fluxo rápido para confirmar consulta, acompanhar reserva e enviar dados complementares.",
  keywords: [
    "agendamento oftalmologico",
    "consulta oftalmologista",
    "retina",
    "catarata",
    "oftalmologista fortaleza",
    "minha agenda",
  ],
  ogImage: "/og-image.png",
  social: {
    oftleonardoSite: "https://oftleonardo.com.br",
    instagram: "https://www.instagram.com/oftleonardo",
  },
  tracking: {
    defaultUtmSource: "oftagenda",
    defaultUtmMedium: "internal",
    defaultUtmCampaign: "crossdomain_seo",
  },
} as const;

export function resolveSiteUrl() {
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.VERCEL_PROJECT_PRODUCTION_URL;

  if (!siteUrl) {
    return new URL(siteConfig.canonical);
  }

  const normalizedSiteUrl = siteUrl.startsWith("http") ? siteUrl : `https://${siteUrl}`;
  try {
    return new URL(normalizedSiteUrl);
  } catch {
    return new URL(siteConfig.canonical);
  }
}

