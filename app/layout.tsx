import type { Metadata } from "next";
import {
  Be_Vietnam_Pro,
  Geist_Mono,
  Noto_Sans_KR,
} from "next/font/google";
import "./globals.css";
import { WebVitals } from "@/components/observability/web-vitals";

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
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  ),
  title: {
    default: "Harutopik — Học tiếng Hàn có lộ trình",
    template: "%s | Harutopik",
  },
  description:
    "Học từ vựng tiếng Hàn nhớ lâu, hiểu ngữ pháp dễ dàng và luyện tập theo lộ trình TOPIK dành cho người Việt.",
  applicationName: "Harutopik",
  alternates: { canonical: "/" },
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
    title: "Harutopik — Học tiếng Hàn có lộ trình",
    description:
      "Học từ vựng nhớ lâu, hiểu ngữ pháp dễ dàng và tiến bộ mỗi ngày cùng Harutopik.",
    images: [{ url: "/HaruPenguin.png", width: 1200, height: 630, alt: "Harutopik — Học tiếng Hàn có lộ trình" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Harutopik — Học tiếng Hàn có lộ trình",
    description:
      "Học từ vựng nhớ lâu, hiểu ngữ pháp dễ dàng và tiến bộ mỗi ngày cùng Harutopik.",
    images: ["/HaruPenguin.png"],
  },
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
        <a href="#main-content" className="skip-link">Chuyển đến nội dung chính</a>
        <div id="main-content" tabIndex={-1}>{children}</div>
        <WebVitals />
      </body>
    </html>
  );
}
