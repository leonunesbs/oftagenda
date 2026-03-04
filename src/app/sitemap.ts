import type { MetadataRoute } from "next";

import { resolveSiteUrl } from "@/config/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = resolveSiteUrl().toString().replace(/\/$/, "");
  const now = new Date();

  return [
    {
      url: `${baseUrl}/`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${baseUrl}/agendar`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/status`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${baseUrl}/sign-in`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.4,
    },
    {
      url: `${baseUrl}/sign-up`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.4,
    },
  ];
}

