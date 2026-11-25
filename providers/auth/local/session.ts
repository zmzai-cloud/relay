import { createHmac, hkdfSync, timingSafeEqual } from "node:crypto";

import { requireAuthSecret } from "@/config/env";

/**
 * local 会话令牌：HMAC-SHA256 签名的紧凑 JWT 式（无第三方依赖）。
 * payload = base64url({uid, exp})，签名密钥由 AUTH_SECRET 经 HKDF 派生
 * （与共享会话的 hashToken 用途隔离，不新增 env 键）。
 */
export const LOCAL_SESSION_COOKIE = "relay_local_session";
const SESSION_TTL_SECONDS = 30 * 24 * 3600;

const b64u = (buf: Buffer | string) => Buffer.from(buf).toString("base64url");
const fromB64u = (s: string) => Buffer.from(s, "base64url");

function sessionKey(): Buffer {
  return Buffer.from(hkdfSync("sha256", requireAuthSecret(), "relay-local-session", "v1", 32));
}

function sign(payload: string): string {
  return b64u(createHmac("sha256", sessionKey()).update(payload).digest());
}

export function signSessionToken(uid: string, nowMs = Date.now()): { token: string; maxAge: number } {
  const exp = Math.floor(nowMs / 1000) + SESSION_TTL_SECONDS;
  const payload = b64u(JSON.stringify({ uid, exp }));
  return { token: `${payload}.${sign(payload)}`, maxAge: SESSION_TTL_SECONDS };
}

/** 校验签名与有效期，返回 uid；任何不合法返回 null（不抛错，登录面静默 401）。 */
export function parseSessionToken(token: string, nowMs = Date.now()): string | null {
  const dot = token.indexOf(".");
  if (dot <= 0) return null;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  let expected: string;
  try {
    expected = sign(payload);
  } catch {
    return null;
  }
  const a = fromB64u(sig);
  const b = fromB64u(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(fromB64u(payload).toString("utf8")) as { uid?: unknown; exp?: unknown };
    if (typeof data.uid !== "string" || typeof data.exp !== "number") return null;
    if (data.exp * 1000 <= nowMs) return null;
    return data.uid;
  } catch {
    return null;
  }
}
