import { cookies } from "next/headers";

import { getServerEnv } from "@/config/env";
import type { AuthProvider, LocalAuth } from "@/providers/auth/types";
import type { CurrentUser } from "@/providers/auth/session-shape";
import { LOCAL_SESSION_COOKIE, parseSessionToken, signSessionToken } from "@/providers/auth/local/session";
import { getLocalUserModel, type LocalUserDocument } from "@/providers/auth/local/user-model";
import { hashPassword, verifyPassword } from "@/providers/auth/local/password";

function toAccount(user: LocalUserDocument): CurrentUser {
  return {
    id: user._id.toString(),
    name: user.name || user.email.split("@")[0],
    email: user.email,
    role: user.role,
    status: user.status,
    emailVerified: user.emailVerified,
  };
}

async function findUser(uid: string): Promise<LocalUserDocument | null> {
  const model = await getLocalUserModel();
  return model.findById(uid).lean<LocalUserDocument>() ?? null;
}

export const localProvider: AuthProvider & LocalAuth = {
  id: "local",

  async getCurrentUser(): Promise<CurrentUser | null> {
    const token = (await cookies()).get(LOCAL_SESSION_COOKIE)?.value;
    if (!token) return null;
    const uid = parseSessionToken(token);
    if (!uid) return null;
    const user = await findUser(uid);
    if (!user || user.status !== "active") return null;
    return toAccount(user);
  },

  async destroySession(): Promise<void> {
    // 无服务端会话表：令牌无状态，清除 cookie 即登出（令牌自然过期兜底）。
    const env = getServerEnv();
    (await cookies()).set(LOCAL_SESSION_COOKIE, "", {
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });
  },

  async verifyCredential(email: string, password: string): Promise<CurrentUser | null> {
    const model = await getLocalUserModel();
    const user = await model.findOne({ email: email.trim().toLowerCase() }).lean<LocalUserDocument>();
    if (!user) return null;
    if (!(await verifyPassword(user.passwordHash, password))) return null;
    if (user.status !== "active") return null;
    return toAccount(user);
  },

  async createUser(input: { email: string; password: string; name?: string; role?: "admin" | "user" }): Promise<CurrentUser> {
    const model = await getLocalUserModel();
    const doc = await model.create({
      email: input.email.trim().toLowerCase(),
      name: input.name ?? input.email.split("@")[0],
      passwordHash: await hashPassword(input.password),
      role: input.role ?? "user",
    });
    return toAccount(doc.toObject() as LocalUserDocument);
  },

  /** 登录成功后写会话 cookie（route handler 调用）。 */
  async issueSessionCookie(uid: string): Promise<void> {
    const env = getServerEnv();
    const { token, maxAge } = signSessionToken(uid);
    (await cookies()).set(LOCAL_SESSION_COOKIE, token, {
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge,
    });
  },
};
