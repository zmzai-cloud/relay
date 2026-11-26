"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { Button } from "@zmzai/theme";
import { siteHost } from "@/config/site-origin";

const AUTH_URL = process.env.NEXT_PUBLIC_AUTH_URL || "https://auth.zmzai.cloud";
/** 品牌词（开源部署设 NEXT_PUBLIC_BRAND_NAME；默认 Margin=zmzai 现状） */
const BRAND_NAME = process.env.NEXT_PUBLIC_BRAND_NAME || "Margin";

const NAV = [
  { label: "模型广场", href: "/models" },
  { label: "API 文档", href: "/docs" },
];

/**
 * 公开区外壳（V3 台账设计·UI 批次 A）：顶栏导航替代侧栏——公开页做产品叙事，
 * 控制台登录后仍是侧栏工作台（app-shell 不变）。
 * 保持旧 props 签名（user/isAdminUser），公开页面调用面零改动。
 */
export function PublicShell({
  user,
  isAdminUser = false,
  children,
}: {
  user?: { name: string } | null;
  isAdminUser?: boolean;
  children: ReactNode;
}) {
  const pathname = usePathname() ?? "/";
  const target = isAdminUser ? "/admin" : "/dashboard";

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-40 border-b border-line bg-bg/92 backdrop-blur">
        <div className="page-shell flex h-14 items-center gap-7">
          <Link href="/" className="flex items-center gap-2.5">
            <svg className="h-[22px] w-[22px] text-ink" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M10 14a4.5 4.5 0 0 0 6.4.4l2.8-2.8a4.5 4.5 0 0 0-6.4-6.4l-1.6 1.6" />
              <path d="M14 10a4.5 4.5 0 0 0-6.4-.4L4.8 12.4a4.5 4.5 0 0 0 6.4 6.4l1.6-1.6" />
            </svg>
            <span className="text-[15px] font-semibold tracking-tight">
              {BRAND_NAME}
              <span className="ml-1.5 text-xs font-normal text-ink-3">{siteHost()}</span>
            </span>
          </Link>
          <nav className="flex items-center gap-1" aria-label="公开区">
            {NAV.map((item) => {
              const active = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`rounded-sm px-3 py-1.5 text-sm transition-colors ${active ? "bg-surface-2 text-ink" : "text-ink-2 hover:bg-surface hover:text-ink"}`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="ml-auto flex items-center gap-3">
            {user ? (
              <Link href={target}>
                <Button size="sm">{isAdminUser ? "进入管理后台" : "进入控制台"}</Button>
              </Link>
            ) : (
              <Link href={`${AUTH_URL}/login?next=${encodeURIComponent(`https://${siteHost()}${target}`)}`}>
                <Button size="sm">登录</Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-line">
        <div className="page-shell flex items-center gap-5 py-5">
          <svg className="h-4 w-4 text-ink-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M10 14a4.5 4.5 0 0 0 6.4.4l2.8-2.8a4.5 4.5 0 0 0-6.4-6.4l-1.6 1.6" />
            <path d="M14 10a4.5 4.5 0 0 0-6.4-.4L4.8 12.4a4.5 4.5 0 0 0 6.4 6.4l1.6-1.6" />
          </svg>
          <span className="text-xs text-ink-3">
            {BRAND_NAME} · OpenAI 兼容的统一模型 API
          </span>
          <div className="ml-auto flex gap-4">
            {NAV.map((item) => (
              <Link key={item.href} href={item.href} className="text-xs text-ink-2 hover:text-ink">
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
