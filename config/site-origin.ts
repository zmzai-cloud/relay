/**
 * 站点对外 origin 单事实源（开源化批次 1）。
 *
 * client / server 通用：NEXT_PUBLIC_ 前缀在两端都会被 Next 内联。
 * 默认值 = 迁移前的生产域名，未配置时行为与旧硬编码完全一致；
 * zmzai 生产档案应设 NEXT_PUBLIC_API_ORIGIN=https://relay.zmzai.cloud
 * （见 docs/open-product-architecture.md §2.5 部署档案）。
 */
export const SITE_ORIGIN = (process.env.NEXT_PUBLIC_API_ORIGIN || "https://m.zmzai.cloud").replace(/\/+$/, "");

/** 对外 API 绝对地址（curl 示例 / 文档 baseURL / 登录回跳）。 */
export function apiUrl(path: string): string {
  return `${SITE_ORIGIN}${path}`;
}

/** 对外展示用的短域名（侧栏/页脚品牌后缀）。 */
export function siteHost(): string {
  try {
    return new URL(SITE_ORIGIN).host;
  } catch {
    return SITE_ORIGIN;
  }
}

/** 未登录跳转：auth SSO 登录页，next 回跳本站 path。 */
export function loginUrl(path: string): string {
  const auth = (process.env.NEXT_PUBLIC_AUTH_URL || "https://auth.zmzai.cloud").replace(/\/+$/, "");
  return `${auth}/login?next=${encodeURIComponent(apiUrl(path))}`;
}
