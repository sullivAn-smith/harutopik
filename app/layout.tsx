import type { Metadata } from "next";
import {
  Be_Vietnam_Pro,
  Geist_Mono,
  Noto_Sans_KR,
} from "next/font/google";
import "./globals.css";
import { WebVitals } from "@/components/observability/web-vitals";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://harutopik.com";
const homeTitle =
  "Học tiếng Hàn - Luyện thi TOPIK có lộ trình";
const homeDescription =
  "Học tiếng Hàn online miễn phí với lộ trình rõ ràng, giáo trình từ sơ cấp đến nâng cao, từ vựng, ngữ pháp, Speed Test và luyện đề TOPIK.";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const beVietnamPro = Be_Vietnam_Pro({
  variable: "--font-be-vietnam-pro",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const notoSansKr = Noto_Sans_KR({
  variable: "--font-noto-sans-kr",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(
    siteUrl,
  ),
  title: {
    default: homeTitle,
    template: "%s | Harutopik",
  },
  description: homeDescription,
  applicationName: "Harutopik",
  creator: "Harutopik",
  publisher: "Harutopik",
  alternates: { canonical: "/" },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "32x32" },
      { url: "/favicon-96x96.png", type: "image/png", sizes: "96x96" },
      { url: "/icon.png", type: "image/png", sizes: "512x512" },
    ],
    shortcut: "/favicon.ico",
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
  },
  keywords: [
    "học tiếng Hàn",
    "TOPIK",
    "từ vựng tiếng Hàn",
    "ngữ pháp tiếng Hàn",
    "Harutopik",
  ],
  openGraph: {
    type: "website",
    locale: "vi_VN",
    siteName: "Harutopik",
    url: "/",
    title: homeTitle,
    description: homeDescription,
    images: [{ url: "/Harutopik.jpg", width: 1200, height: 630, alt: "Học tiếng Hàn cùng Harutopik" }],
  },
  twitter: {
    card: "summary_large_image",
    title: homeTitle,
    description: homeDescription,
    images: ["/Harutopik.jpg"],
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${siteUrl}/#website`,
      url: `${siteUrl}/`,
      name: "Harutopik",
      alternateName: "Haru TOPIK",
      inLanguage: "vi-VN",
      publisher: { "@id": `${siteUrl}/#organization` },
    },
    {
      "@type": "Organization",
      "@id": `${siteUrl}/#organization`,
      name: "Harutopik",
      url: `${siteUrl}/`,
      logo: {
        "@type": "ImageObject",
        url: `${siteUrl}/icon.png`,
        width: 512,
        height: 512,
      },
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="vi"
      className={`${beVietnamPro.variable} ${notoSansKr.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
          }}
        />
        <a href="#main-content" className="skip-link">Chuyển đến nội dung chính</a>
        <div id="main-content" tabIndex={-1}>{children}</div>
        <WebVitals />
      </body>
    </html>
  );
}
