import { getServerEnv } from "@/config/env";
import type { PaymentProvider } from "@/providers/billing/payment/types";
import { manualProvider } from "@/providers/billing/payment/manual";

/**
 * PaymentProvider 分发（开源化批次 2）。PAYMENT_PROVIDER 当前只接受 manual；
 * epay/stripe 实现落地后扩展 config/env.ts 的枚举与这里的注册表。
 */
let cached: PaymentProvider | undefined;

export function getPaymentProvider(): PaymentProvider {
  cached ??= getServerEnv().PAYMENT_PROVIDER === "manual" ? manualProvider : manualProvider;
  return cached;
}

export { manualProvider, generateOrderNo, CLAIM_KEY_TTL_MS } from "@/providers/billing/payment/manual";
