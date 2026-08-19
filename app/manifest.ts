import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Harutopik — Học tiếng Hàn miễn phí",
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
        src: "/favicon-96x96.png",
        sizes: "96x96",
        type: "image/png",
      },
      {
        src: "/icon.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
