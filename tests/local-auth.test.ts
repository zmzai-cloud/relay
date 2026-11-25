import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * local 认证（开源化批次 2）：无状态令牌 + argon2id + provider 分发。
 * 全部纯函数级，不依赖 Mongo。
 */
const BASE_ENV = {
  NODE_ENV: "test" as const,
  APP_URL: "http://localhost:3002",
  MONGODB_URI: "mongodb://127.0.0.1:27017/test",
  AUTH_SECRET: "unit-test-secret-0123456789abcdef0123456789",
};

async function loadModule(env: Record<string, string | undefined>) {
  vi.resetModules();
  vi.unstubAllEnvs();
  for (const [k, v] of Object.entries({ ...BASE_ENV, ...env })) {
    if (v !== undefined) vi.stubEnv(k, v);
  }
  return import("@/providers/auth/local/session");
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("local 会话令牌", () => {
  it("签发→解析往返返回 uid", async () => {
    const m = await loadModule({});
    const { token } = m.signSessionToken("u123");
    expect(m.parseSessionToken(token)).toBe("u123");
  });

  it("有效期 30 天，到期拒绝", async () => {
    const m = await loadModule({});
    const now = Date.now();
    const { token } = m.signSessionToken("u1", now);
    expect(m.parseSessionToken(token, now + 29 * 24 * 3600 * 1000)).toBe("u1");
    expect(m.parseSessionToken(token, now + 31 * 24 * 3600 * 1000)).toBeNull();
  });

  it("篡改 payload / 签名均拒绝", async () => {
    const m = await loadModule({});
    const { token } = m.signSessionToken("u1");
    const [payload, sig] = token.split(".");
    const forged = Buffer.from(JSON.stringify({ uid: "evil", exp: Math.floor(Date.now() / 1000) + 9999 })).toString("base64url");
    expect(m.parseSessionToken(`${forged}.${sig}`)).toBeNull();
    expect(m.parseSessionToken(`${payload}.${"A".repeat(sig.length)}`)).toBeNull();
  });

  it("换 AUTH_SECRET 后旧令牌失效", async () => {
    const m1 = await loadModule({});
    const { token } = m1.signSessionToken("u1");
    const m2 = await loadModule({ AUTH_SECRET: "another-secret-0123456789abcdef0123456" });
    expect(m2.parseSessionToken(token)).toBeNull();
  });

  it("乱码令牌静默返回 null", async () => {
    const m = await loadModule({});
    expect(m.parseSessionToken("not-a-token")).toBeNull();
    expect(m.parseSessionToken("")).toBeNull();
  });
});

describe("argon2id 密码", () => {
  it("哈希→校验往返；错误密码拒绝；哈希不含明文", async () => {
    const { hashPassword, verifyPassword } = await import("@/providers/auth/local/password");
    const h = await hashPassword("correct horse battery staple");
    expect(h).not.toContain("correct");
    expect(await verifyPassword(h, "correct horse battery staple")).toBe(true);
    expect(await verifyPassword(h, "wrong")).toBe(false);
  });
});

describe("AuthProvider 分发", () => {
  async function providerId(env: Record<string, string>) {
    vi.resetModules();
    vi.unstubAllEnvs();
    for (const [k, v] of Object.entries({ ...BASE_ENV, ...env })) vi.stubEnv(k, v);
    const { getAuthProvider } = await import("@/providers/auth");
    return getAuthProvider().id;
  }

  it("默认 zmzai_sso（零行为变化）；local 可切换", async () => {
    expect(await providerId({})).toBe("zmzai_sso");
    expect(await providerId({ AUTH_PROVIDER: "local" })).toBe("local");
  });
});
