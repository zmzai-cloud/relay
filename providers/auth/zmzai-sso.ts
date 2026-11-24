import { cookies } from "next/headers";

import { getServerEnv, requireAuthSecret } from "@/config/env";
import { connectMongo } from "@/providers/database/mongodb/connection";
import type { AuthProvider, LocalAuth } from "@/providers/auth/types";
import type { CurrentUser } from "@/providers/auth/session-shape";

/**
 * zmzai SSO（现状原样搬迁）：读 muzhi 的共享 session cookie（跨子域 .zmzai.cloud）
 * → 校验共享 Session 表 → 返回用户。前提：与 muzhi 同库、同 AUTH_SECRET。
 * @zmzai/db 仅在此适配器内引用——local 部署不加载本模块。
 */
import {
  SessionModel,
  UserModel,
  hashToken,
  type UserDocument,
} from "@zmzai/db";

function toAccount(user: UserDocument): CurrentUser {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    emailVerified: user.emailVerified,
  };
}

export const zmzaiSsoProvider: AuthProvider & Partial<LocalAuth> = {
  id: "zmzai_sso",

  async getCurrentUser(): Promise<CurrentUser | null> {
    const env = getServerEnv();
    const token = (await cookies()).get(env.SESSION_COOKIE_NAME)?.value;
    if (!token) return null;

    await connectMongo();
    const session = await SessionModel.findOne({
      tokenHash: hashToken(requireAuthSecret(), token),
      expiresAt: { $gt: new Date() },
    });
    if (!session) return null;

    const user = await UserModel.findById(session.userId);
    if (
      !user ||
      user.status !== "active" ||
      (!user.emailVerified && user.role !== "admin")
    ) {
      return null;
    }
    return toAccount(user);
  },

  async destroySession(): Promise<void> {
    const env = getServerEnv();
    const cookieStore = await cookies();
    const token = cookieStore.get(env.SESSION_COOKIE_NAME)?.value;
    if (token) {
      await connectMongo();
      await SessionModel.deleteOne({ tokenHash: hashToken(requireAuthSecret(), token) });
    }
    cookieStore.set(env.SESSION_COOKIE_NAME, "", {
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      ...(env.SESSION_COOKIE_DOMAIN ? { domain: env.SESSION_COOKIE_DOMAIN } : {}),
      maxAge: 0,
    });
  },
};
