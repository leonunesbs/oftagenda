import type { MetadataRoute } from "next";

import { resolveSiteUrl } from "@/config/site";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = resolveSiteUrl();

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/agendar", "/status", "/sign-in", "/sign-up"],
        disallow: ["/dashboard", "/detalhes", "/api/", "/embed/"],
      },
    ],
    sitemap: `${siteUrl.toString().replace(/\/$/, "")}/sitemap.xml`,
    host: siteUrl.toString(),
  };
}

