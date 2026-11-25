import { redirect } from "next/navigation";
import Link from "next/link";

import { getServerEnv } from "@/config/env";
import { getCurrentUser } from "@/providers/auth/session";
import { loginUrl } from "@/config/site-origin";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";
export const metadata = { title: "登录" };

/**
 * 登录页（开源化批次 2）：
 * - local 模式：本站邮箱密码表单；
 * - zmzai_sso 模式：直接 307 到共享 SSO（页面本身不渲染）。
 */
export default async function LoginPage() {
  const env = getServerEnv();
  if (env.AUTH_PROVIDER !== "local") {
    redirect(loginUrl("/dashboard"));
  }
  const user = await getCurrentUser();
  if (user) redirect(user.role === "admin" ? "/admin" : "/dashboard");
  return (
    <main className="flex min-h-dvh items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-semibold tracking-tight">登录到控制台</h1>
        <p className="mt-2 text-sm text-ink-2">使用管理员创建的账号，或注册邮箱联系管理员开通。</p>
        <LoginForm />
        <p className="mt-6 text-xs text-ink-3">
          <Link href="/" className="hover:text-ink-2">← 返回首页</Link>
        </p>
      </div>
    </main>
  );
}
