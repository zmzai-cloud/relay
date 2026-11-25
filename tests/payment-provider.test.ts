import { afterEach, describe, expect, it, vi } from "vitest";

/** PaymentProvider 壳（开源化批次 2）：纯函数面；createOrder 的 DB 路径由端到端冒烟覆盖。 */
import { CLAIM_KEY_TTL_MS, generateClaimKey, generateOrderNo } from "@/providers/billing/payment/manual";

describe("manual 申请码", () => {
  it("格式：R + 7 位无混淆字符", () => {
    for (let i = 0; i < 200; i++) {
      expect(generateClaimKey()).toMatch(/^R[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{7}$/);
    }
  });

  it("200 次采样无重复（碰撞由唯一索引兜底，此处验证基本随机性）", () => {
    const seen = new Set(Array.from({ length: 200 }, generateClaimKey));
    expect(seen.size).toBe(200);
  });

  it("有效期 5 分钟", () => {
    expect(CLAIM_KEY_TTL_MS).toBe(5 * 60 * 1000);
  });
});

describe("manual 订单号", () => {
  it("格式：ZMZ + 时间戳36 + 6 位随机", () => {
    expect(generateOrderNo()).toMatch(/^ZMZ[A-Z0-9]+[A-F0-9]{6}$/);
  });
});

describe("PaymentProvider 分发", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("默认 manual", async () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("APP_URL", "http://localhost:3002");
    vi.stubEnv("MONGODB_URI", "mongodb://127.0.0.1:27017/test");
    vi.stubEnv("AUTH_SECRET", "unit-test-secret-0123456789abcdef0123456789");
    const { getPaymentProvider } = await import("@/providers/billing/payment");
    expect(getPaymentProvider().id).toBe("manual");
  });
});
