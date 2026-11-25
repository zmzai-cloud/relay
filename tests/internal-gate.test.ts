import { afterEach, describe, expect, it, vi } from "vitest";

/** InternalModules 门控（开源化批次 3）：env 解析语义——默认开=zmzai 零变化。 */
const BASE = {
  NODE_ENV: "test" as const,
  APP_URL: "http://localhost:3002",
  MONGODB_URI: "mongodb://127.0.0.1:27017/test",
  AUTH_SECRET: "unit-test-secret-0123456789abcdef0123456789",
};

async function enabled(env: Record<string, string | undefined>): Promise<boolean> {
  vi.resetModules();
  vi.unstubAllEnvs();
  for (const [k, v] of Object.entries({ ...BASE, ...env })) {
    if (v !== undefined) vi.stubEnv(k, v);
  }
  const { internalModulesEnabled } = await import("@/config/internal-modules");
  return internalModulesEnabled();
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("ENABLE_ZMZAI_INTERNAL 解析", () => {
  it("未设置 = 开（zmzai 现网零变化）", async () => {
    expect(await enabled({})).toBe(true);
  });

  it("空串 = 开（env 文件留空键不误伤）", async () => {
    expect(await enabled({ ENABLE_ZMZAI_INTERNAL: "" })).toBe(true);
  });

  it.each(["false", "0", "no", "off", "FALSE", " Off "])("显式关闭：%s", async (v) => {
    expect(await enabled({ ENABLE_ZMZAI_INTERNAL: v })).toBe(false);
  });

  it.each(["true", "1", "yes", "on", "TRUE"])("显式开启：%s", async (v) => {
    expect(await enabled({ ENABLE_ZMZAI_INTERNAL: v })).toBe(true);
  });

  it("未知值按关闭处理（安全侧）", async () => {
    expect(await enabled({ ENABLE_ZMZAI_INTERNAL: "maybe" })).toBe(false);
  });
});
