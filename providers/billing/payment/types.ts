import type { WalletOrderDocument } from "@/providers/database/mongodb/models/wallet-order";
import type { WalletProduct } from "@/providers/billing/wallet-products";

/** createOrder 返回创建成功的订单文档（路由层 toObject 后原样回给前端）。 */
export type CreatedOrder = WalletOrderDocument;

/**
 * 支付提供方接口（开源化批次 2）：P1 只落 manual（人工申请码）。
 * 在线支付（epay/stripe）落地时实现本接口并注册到 index.ts。
 *
 * 边界约定：createOrder 是支付方式的差异点（申请码 vs 跳转/支付参数）；
 * 到账核销（余额账本、对账、审计的事务）属计费核心，留在
 * /api/admin/orders/[id]，任何 provider 的收款最终都汇入同一条核销路径。
 */
export interface CreateOrderInput {
  userId: string;
  product: WalletProduct;
  paymentMethod: "wechat" | "alipay";
}

export interface PaymentProvider {
  readonly id: "manual" | "epay" | "stripe";
  createOrder(input: CreateOrderInput): Promise<CreatedOrder>;
}
