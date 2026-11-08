import type { MetadataRoute } from "next";

export const dynamic = "force-dynamic";

export default function sitemap(): MetadataRoute.Sitemap {
  const origin = process.env.ADVERITY_ORIGIN || "http://localhost:3000";
  return [{ url: origin, changeFrequency: "weekly", priority: 1 }];
}
