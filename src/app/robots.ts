import type { MetadataRoute } from "next";

import { resolveSiteUrl } from "@/config/site";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = resolveSiteUrl();

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/agendar", "/status", "/termos-de-uso", "/politica-de-privacidade"],
        disallow: ["/dashboard", "/detalhes", "/api/", "/embed/", "/sign-in", "/sign-up"],
      },
    ],
    sitemap: `${siteUrl.toString().replace(/\/$/, "")}/sitemap.xml`,
    host: siteUrl.toString(),
  };
}

