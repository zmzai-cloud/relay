import { getAuthProvider } from "@/providers/auth";

import type { CurrentUser } from "@/providers/auth/session-shape";

export type { CurrentUser, UserRole, UserStatus } from "@/providers/auth/session-shape";

/**
 * 会话门面（开源化批次 2）：转发到 AUTH_PROVIDER 选定的实现。
 * 页面与 API 的调用面保持不变；zmzai_sso 行为与原实现逐行一致。
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  return getAuthProvider().getCurrentUser();
}

export async function destroySession(): Promise<void> {
  return getAuthProvider().destroySession();
}

export class AdminRequiredError extends Error {
  constructor() {
    super("ADMIN_REQUIRED");
    this.name = "AdminRequiredError";
  }
}

export async function requireAdmin(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    throw new AdminRequiredError();
  }
  return user;
}
