import type { CurrentUser } from "@/providers/auth/session-shape";

/** 认证提供方接口（开源化批次 2）：local 与 zmzai_sso 双实现，页面调用面只经 session.ts 薄转发。 */
export interface AuthProvider {
  readonly id: "local" | "zmzai_sso";

  /** 解析当前请求用户（cookie → 会话 → 用户）；未登录返回 null。 */
  getCurrentUser(): Promise<CurrentUser | null>;

  /** 登出：清会话与本站 cookie。 */
  destroySession(): Promise<void>;
}

/** local 专属能力：凭据校验与用户创建（安装向导用）。zmzai_sso 不实现（用户在 auth 域管理）。 */
export interface LocalAuth {
  verifyCredential(email: string, password: string): Promise<CurrentUser | null>;
  /** 登录成功后写 HttpOnly 会话 cookie（route handler 内调用）。 */
  issueSessionCookie(uid: string): Promise<void>;
  createUser(input: { email: string; password: string; name?: string; role?: "admin" | "user" }): Promise<CurrentUser>;
}
