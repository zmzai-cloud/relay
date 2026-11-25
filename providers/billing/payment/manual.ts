import { randomBytes, randomUUID } from "node:crypto";

import { connectMongo } from "@/providers/database/mongodb/connection";
import { WalletOrderModel } from "@/providers/database/mongodb/models/wallet-order";
import type { CreateOrderInput, PaymentProvider } from "@/providers/billing/payment/types";

/** 申请码有效期：用户需在此时间内把码发给管理员核销。 */
export const CLAIM_KEY_TTL_MS = 5 * 60 * 1000;
/** 去掉易混淆字符（0/O、1/I/L）的码表，方便微信里抄写。 */
const CLAIM_KEY_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

export function generateClaimKey(): string {
  const bytes = randomBytes(7);
  let key = "";
  for (const byte of bytes) key += CLAIM_KEY_ALPHABET[byte % CLAIM_KEY_ALPHABET.length];
  return `R${key}`;
}

export function generateOrderNo(): string {
  return `ZMZ${Date.now().toString(36).toUpperCase()}${randomUUID().slice(0, 6).toUpperCase()}`;
}

/** 人工收款（现状）：创建带 5 分钟申请码的充值申请单，等待管理员线下核销。 */
export const manualProvider: PaymentProvider = {
  id: "manual",

  async createOrder(input: CreateOrderInput) {
    await connectMongo();
    // 唯一索引冲突时重试换码（碰撞概率极低）
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        // mongoose 8 单对象 create 的重载在联合类型上会误选数组签名；运行时此处恒为单文档
        const order = (await WalletOrderModel.create({
          orderNo: generateOrderNo(),
          userId: input.userId,
          productId: input.product.id,
          productName: input.product.name,
          creditMicros: input.product.creditMicros,
          paymentAmountFen: input.product.paymentAmountFen,
          paymentMethod: input.paymentMethod,
          status: "pending",
          claimKey: generateClaimKey(),
          expiresAt: new Date(Date.now() + CLAIM_KEY_TTL_MS),
        })) as import("./types").CreatedOrder;
        return order;
      } catch (error) {
        if ((error as { code?: number })?.code !== 11000) throw error;
      }
    }
    throw new Error("CLAIM_KEY_COLLISION");
  },
};
