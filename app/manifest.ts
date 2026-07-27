import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Harutopik — Học tiếng Hàn có lộ trình",
    short_name: "Harutopik",
    description:
      "Học tiếng Hàn dành cho người Việt với bài học thực hành và SRS thông minh.",
    start_url: "/",
    display: "standalone",
    background_color: "#f7fbff",
    theme_color: "#087eba",
    lang: "vi",
    icons: [
      {
        src: "/harutopik-logo-key.png",
        sizes: "any",
        type: "image/png",
      },
    ],
  };
}
