import { getServerEnv } from "@/config/env";

/**
 * zmzai 内部端点开关（开源化批次 3，五接缝之 InternalModules）：
 * ENABLE_ZMZAI_INTERNAL 未设或空 = 开（zmzai 现网兼容）；
 * "false"/"0"/"no"/"off" = 关（自托管 compose 默认关）。
 * 关闭时 /api/internal/* 一律 404（不暴露端点存在性），服务密钥鉴权不再可达。
 */
export function internalModulesEnabled(): boolean {
  return getServerEnv().ENABLE_ZMZAI_INTERNAL;
}
