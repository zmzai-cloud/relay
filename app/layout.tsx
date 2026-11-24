import type { Metadata, Viewport } from "next";
import { JetBrains_Mono } from "next/font/google";
import "./globals.css";

// 中文主字体 MiSans 走 jsDelivr CDN @font-face（globals.css），不用 next/font 加载 CJK。
const mono = JetBrains_Mono({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-mono", display: "swap" });

/** 品牌文案整条覆盖（开源化批次 1）：默认值与旧硬编码一致，zmzai 档案见 .env.example。 */
const SITE_TITLE = process.env.BRAND_SITE_TITLE || "Margin · zmzai.cloud";
const SITE_TAGLINE = process.env.BRAND_TAGLINE || "OpenAI 兼容的统一模型 API 入口 · zmzai.cloud 子产品";

export const metadata: Metadata = {
  title: SITE_TITLE,
  description: SITE_TAGLINE,
};

export const viewport: Viewport = { themeColor: "#FFFFFF" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" className={mono.variable}>
      <body>{children}</body>
    </html>
  );
}
