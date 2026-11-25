import { getServerEnv } from "@/config/env";
import type { AuthProvider } from "@/providers/auth/types";
import { zmzaiSsoProvider } from "@/providers/auth/zmzai-sso";
import { localProvider } from "@/providers/auth/local/provider";

/**
 * AuthProvider 分发（开源化批次 2）。
 * AUTH_PROVIDER=local → 本站账号密码；zmzai_sso（默认）→ 共享会话现状。
 * 启动后不热切换：模块级缓存一次。
 */
let cached: AuthProvider | undefined;

export function getAuthProvider(): AuthProvider {
  cached ??= getServerEnv().AUTH_PROVIDER === "local" ? localProvider : zmzaiSsoProvider;
  return cached;
}

export { localProvider, zmzaiSsoProvider };
export { LOCAL_SESSION_COOKIE } from "@/providers/auth/local/session";
export type { LocalAuth } from "@/providers/auth/types";
