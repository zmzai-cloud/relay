import { z } from "zod";

/**
 * 遥测事件契约（自 @zmzai/contracts 内联，2026-11-24，schema v1）。
 * 内联原因：开源化剥离私有 GitHub 依赖；本文件是 relay 侧唯一消费面
 * （providers/telemetry.ts → zmzai-billing ingest）。schema 属 v1 稳定面，
 * 若 zmzai 生态后续演进 events 契约，须与 zmzai-billing 同步后再更新此处。
 */

const Z_EVENT_SERVICES = ["relay", "agent", "sandbox", "arena", "memory", "auth", "hub", "workos", "muzhi", "billing", "status"] as const;

const ZEventType = z.enum(["usage.recorded", "span.closed"]);

const ZEventBaseSchema = z.object({
  id: z.string().min(1).max(64).describe("事件唯一标识（uuid），用于幂等"),
  traceId: z.string().max(128).optional().describe("关联的分布式追踪 ID（x-trace-id 格式）"),
  service: z.enum(Z_EVENT_SERVICES),
  type: ZEventType,
  actorId: z.string().max(128).nullish().describe("行为主体（用户/Agent 标识）"),
  payload: z.unknown().describe("事件负载，由具体事件 schema 约束"),
  at: z.string().datetime({ offset: true }).or(z.string().datetime()).describe("事件时间 ISO 8601"),
});

const USAGE_PRODUCTS = ["relay", "agent", "arena", "memory", "sandbox"] as const;
export type UsageProduct = (typeof USAGE_PRODUCTS)[number];

const USAGE_METRICS = ["tokens", "requests", "backtests", "recalls"] as const;
export type UsageMetric = (typeof USAGE_METRICS)[number];

/**
 * usage.recorded 负载：一次可计量的资源消耗。
 * 金额单位沿用 zmzai 生态约定：1,000,000 micros = ¥8.00。
 */
export const UsageRecordedPayloadSchema = z.object({
  userId: z.string().min(1).max(128),
  product: z.enum(USAGE_PRODUCTS),
  metric: z.enum(USAGE_METRICS),
  amount: z.number().int().positive(),
  costMicros: z.number().int().nonnegative().optional(),
  meta: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).optional(),
});

export type UsageRecordedPayload = z.infer<typeof UsageRecordedPayloadSchema>;

export const UsageRecordedEventSchema = ZEventBaseSchema.extend({
  type: z.literal("usage.recorded"),
  payload: UsageRecordedPayloadSchema,
});

export type UsageRecordedEvent = z.infer<typeof UsageRecordedEventSchema>;
