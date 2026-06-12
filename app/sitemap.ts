import type { MetadataRoute } from "next";

import { changelog } from "@/content/data";

const baseUrl = "https://imsway.dev";

// Single-route site. lastModified tracks the newest changelog entry so it
// reflects an actual content change rather than the build timestamp.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: baseUrl,
      lastModified: changelog[0]?.date ?? "2026-01-01",
      changeFrequency: "daily",
      priority: 1,
    },
  ];
}
