import { NextResponse } from "next/server";

import { getAuthProvider } from "@/providers/auth";
import { localProvider } from "@/providers/auth/local/provider";
import { getServerEnv } from "@/config/env";

export const dynamic = "force-dynamic";

/**
 * local 模式登录：邮箱密码 → 校验 → 签发 HttpOnly 会话 cookie。
 * zmzai_sso 模式下本端点 404（前端登录页亦重定向到 SSO）。
 */
export async function POST(request: Request) {
  if (getServerEnv().AUTH_PROVIDER !== "local") {
    return NextResponse.json({ error: "LOCAL_AUTH_DISABLED" }, { status: 404 });
  }
  let body: { email?: unknown; password?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求体必须是 JSON" }, { status: 400 });
  }
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (!email || !password) {
    return NextResponse.json({ error: "请填写邮箱与密码" }, { status: 400 });
  }
  const user = await localProvider.verifyCredential(email, password);
  if (!user) {
    return NextResponse.json({ error: "邮箱或密码不正确" }, { status: 401 });
  }
  await localProvider.issueSessionCookie(user.id);
  return NextResponse.json({ ok: true, user: { name: user.name, email: user.email, role: user.role } });
}

// 显式引用以保持树摇友好（getAuthProvider 在本文件仅用于模式判断）
void getAuthProvider;
