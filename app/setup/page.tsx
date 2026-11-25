import { redirect } from "next/navigation";
import Link from "next/link";

import { getServerEnv } from "@/config/env";
import { getCurrentUser } from "@/providers/auth/session";
import { isInstalled } from "@/providers/site/settings";
import { SetupWizard } from "./setup-wizard";

export const dynamic = "force-dynamic";
export const metadata = { title: "安装向导", robots: { index: false, follow: false } };

/**
 * 首启安装向导（开源化批次 2）：仅 local 模式且未安装时可进。
 * 已安装或非 local 模式一律回首页——该页面不提供任何"重新安装"入口。
 */
export default async function SetupPage() {
  if (getServerEnv().AUTH_PROVIDER !== "local" || (await isInstalled())) {
    redirect("/");
  }
  return (
    <main className="mx-auto min-h-dvh w-full max-w-xl px-6 py-14">
      <p className="font-mono text-xs uppercase tracking-wider text-muted">首次部署</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">安装向导</h1>
      <p className="mt-2 text-sm leading-6 text-ink-2">
        创建管理员账号并设置站点品牌。完成后会引导你接入第一条上游渠道。
      </p>
      <SetupWizard />
      <p className="mt-8 text-xs text-ink-3">
        <Link href="/" className="hover:text-ink-2">← 返回首页</Link>
      </p>
    </main>
  );
}
