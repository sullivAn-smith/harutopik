import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://harutopik.com";
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/quan-tri/", "/tai-khoan"],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
