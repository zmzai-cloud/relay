import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * 站点 origin 单事实源（开源化批次 1）：
 * 默认值必须与旧硬编码完全一致（零行为变化），env 覆盖后全链跟随。
 */

async function loadModule(env: Record<string, string | undefined>) {
  vi.resetModules();
  vi.unstubAllEnvs();
  for (const [k, v] of Object.entries(env)) {
    if (v !== undefined) vi.stubEnv(k, v);
  }
  return import("@/config/site-origin");
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("SITE_ORIGIN 默认值（零行为变化）", () => {
  it("未设置 env 时回退旧生产域名", async () => {
    const m = await loadModule({});
    expect(m.SITE_ORIGIN).toBe("https://m.zmzai.cloud");
  });

  it("空串视为未设置", async () => {
    const m = await loadModule({ NEXT_PUBLIC_API_ORIGIN: "" });
    expect(m.SITE_ORIGIN).toBe("https://m.zmzai.cloud");
  });

  it("尾斜杠被裁剪", async () => {
    const m = await loadModule({ NEXT_PUBLIC_API_ORIGIN: "https://api.example.com/" });
    expect(m.SITE_ORIGIN).toBe("https://api.example.com");
  });
});

describe("apiUrl / siteHost", () => {
  it("拼接对外 API 地址", async () => {
    const m = await loadModule({ NEXT_PUBLIC_API_ORIGIN: "https://api.example.com" });
    expect(m.apiUrl("/v1/chat/completions")).toBe("https://api.example.com/v1/chat/completions");
    expect(m.siteHost()).toBe("api.example.com");
  });

  it("非法 origin 时 siteHost 原样返回不抛错", async () => {
    const m = await loadModule({ NEXT_PUBLIC_API_ORIGIN: "not-a-url" });
    expect(m.siteHost()).toBe("not-a-url");
  });
});

describe("loginUrl（SSO 登录回跳）", () => {
  it("默认 auth 域 + encodeURIComponent 回跳", async () => {
    const m = await loadModule({});
    expect(m.loginUrl("/dashboard")).toBe(
      "https://auth.zmzai.cloud/login?next=" + encodeURIComponent("https://m.zmzai.cloud/dashboard"),
    );
  });

  it("AUTH_URL 与 origin 同时可覆盖", async () => {
    const m = await loadModule({
      NEXT_PUBLIC_API_ORIGIN: "https://relay.example.com",
      NEXT_PUBLIC_AUTH_URL: "https://sso.example.com/",
    });
    expect(m.loginUrl("/admin/orders")).toBe(
      "https://sso.example.com/login?next=" + encodeURIComponent("https://relay.example.com/admin/orders"),
    );
  });
});
