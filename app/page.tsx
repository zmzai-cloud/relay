import Link from "next/link";

import { Button, Terminal } from "@zmzai/theme";
import { ModelTable } from "@/components/model-table";
import { PublicShell } from "@/components/public-shell";
import { apiUrl, loginUrl, siteHost } from "@/config/site-origin";
import { moneyMicros } from "@/providers/catalog/public-model-types";
import { getPublicChannels } from "@/providers/catalog/public-models";
import { connectMongo } from "@/providers/database/mongodb/connection";
import { getCurrentUser } from "@/providers/auth/session";

export const dynamic = "force-dynamic";

const steps: Array<[string, string]> = [
  ["登录并创建 API Key", "使用 zmzai 账号登录，在控制台创建一个 API Key，新账号自带 ¥1 体验额度。"],
  ["按 OpenAI 协议发起请求", "兼容 Chat Completions 接口，OpenAI SDK、curl 直接替换 baseURL 即可调用。"],
  ["查看用量与账单", "每次调用按 token 实时计费，用量、余额与账本在控制台随时核对。"],
];

/** 一次真实调用的结算演示（token 数为演示值，计费口径与线上一致）。 */
const SSETTLE = { inTok: 1840, cached: 1024, outTok: 356 };

export default async function HomePage() {
  const user = await getCurrentUser();
  await connectMongo();
  const channels = await getPublicChannels();
  const totalModels = channels.reduce((sum, ch) => sum + ch.models.length, 0);
  const allModels = channels.flatMap((ch) => ch.models);
  const cheapest = allModels.reduce((min, m) => Math.min(min, m.inputPricePer1kMicros), Infinity);
  const widest = allModels.reduce((max, m) => Math.max(max, m.maxInputTokens), 0);

  return (
    <PublicShell user={user ? { name: user.name } : null} isAdminUser={user?.role === "admin"}>
      {/* Hero：左叙事 · 右终端 */}
      <section className="page-shell grid items-center gap-12 pt-14 lg:grid-cols-[10fr_9fr]">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-ink-2">
            {totalModels} 个模型 · {channels.length} 条上游渠道 · OpenAI 兼容
          </p>
          <h1 className="mt-4 text-[clamp(34px,4.4vw,46px)] font-semibold leading-[1.12] tracking-tight">
            一个入口，
            <br />
            调用所有上游模型
          </h1>
          <p className="mt-4 max-w-[46ch] text-[15.5px] leading-[1.75] text-ink-2">
            Relay 提供 OpenAI 兼容的统一 API：按模型自动路由到上游渠道，价格公开、按 token 计费、缓存命中享折扣。
          </p>
          <div className="mt-7 flex items-center gap-4">
            {user ? (
              <Link href={user.role === "admin" ? "/admin" : "/dashboard"}>
                <Button>进入控制台</Button>
              </Link>
            ) : (
              <Link href={loginUrl("/dashboard")}>
                <Button>登录开始使用</Button>
              </Link>
            )}
            <Link href="/models" className="border-b border-line-strong pb-0.5 text-sm text-ink transition-colors hover:border-ink">
              查看模型与价格
            </Link>
          </div>
          <dl className="mt-8 flex border-t border-rule pt-3.5">
            {[
              [cheapest === Infinity ? "—" : moneyMicros(cheapest), "输入价 / 1K 起"],
              [widest ? `${(widest / 1e6).toFixed(widest % 1e6 ? 1 : 0)}M` : "—", "最大上下文 tokens"],
              ["¥1", "新账号体验额度"],
            ].map(([v, k], i) => (
              <div key={k} className={i > 0 ? "border-l border-line pl-7 pr-7" : "pr-7"}>
                <dd className="font-mono text-[19px] font-semibold tracking-tight">{v}</dd>
                <dt className="mt-0.5 text-xs text-ink-2">{k}</dt>
              </div>
            ))}
          </dl>
        </div>

        <div className="min-w-0">
          <Terminal title="chat/completions · stream">
            <pre className="whitespace-pre-wrap font-mono text-[13px] leading-[1.75]">{`POST ${apiUrl("/api/v1/chat/completions")} — SSE 1.8s
{
  "model": "glm-5.3",
  "stream": true,
  "messages": [{ "role": "user", "content": "帮我总结这份周报" }]
}
data: {"choices":[{"delta":{"content":"本周核心进展…"}}]}
data: {"usage":{"prompt_tokens":${SSETTLE.inTok},
        "completion_tokens":${SSETTLE.outTok},
        "prompt_tokens_details":{"cached_tokens":${SSETTLE.cached}}}}`}</pre>
          </Terminal>
          <p className="mt-2 flex justify-between px-1 font-mono text-xs text-ink-2">
            <span>已结算 · {channels[0]?.channel ?? "上游渠道"}</span>
            <span>
              {SSETTLE.inTok.toLocaleString()} in · {SSETTLE.cached.toLocaleString()} cached · {SSETTLE.outTok.toLocaleString()} out
            </span>
          </p>
        </div>
      </section>

      {/* 模型目录 */}
      <section className="page-shell mt-14">
        <div className="flex items-baseline justify-between border-b border-rule pb-2.5">
          <h2 className="text-base font-semibold">模型目录</h2>
          <Link href="/models" className="font-mono text-xs text-ink-2 transition-colors hover:text-ink">
            完整目录与排序 →
          </Link>
        </div>
        <div className="mt-4">
          <ModelTable channels={channels} />
        </div>
      </section>

      {/* 三步接入 */}
      <section className="page-shell mt-14">
        <div className="border-b border-rule pb-2.5">
          <h2 className="text-base font-semibold">三步接入</h2>
        </div>
        <ol className="mt-4 grid gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-3">
          {steps.map(([title, desc], index) => (
            <li key={title} className="bg-bg p-5">
              <p className="font-mono text-xs text-ink-2">{String(index + 1).padStart(2, "0")}</p>
              <p className="mt-2 text-[15px] font-semibold">{title}</p>
              <p className="mt-1.5 text-[13px] leading-[1.65] text-ink-2">{desc}</p>
            </li>
          ))}
        </ol>
        <div className="mt-4">
          <Terminal title="curl — chat completions">
            <span>{`curl ${apiUrl("/api/v1/chat/completions")} \\
  -H "Authorization: Bearer <YOUR_API_KEY>" \\
  -H "Content-Type: application/json" \\
  -d '{"model":"YOUR_MODEL_ID","messages":[{"role":"user","content":"你好"}]}'`}</span>
          </Terminal>
        </div>
      </section>

      {/* 渠道路由 */}
      <section className="page-shell mt-14 mb-20">
        <div className="border-b border-rule pb-2.5">
          <h2 className="text-base font-semibold">渠道路由</h2>
        </div>
        <div className="mt-4 flex flex-col overflow-hidden rounded-lg border border-line sm:flex-row sm:items-stretch">
          <div className="flex-1 p-5">
            <p className="font-mono text-[11px] uppercase tracking-[0.06em] text-ink-2">调用方</p>
            <p className="mt-2 text-sm font-medium">OpenAI SDK · zcode · codex</p>
            <p className="mt-1 text-[12.5px] text-ink-2">任何说 OpenAI 协议的工具</p>
          </div>
          <div className="flex items-center justify-center border-y border-line px-3 py-2 text-ink-3 sm:border-x sm:border-y-0" aria-hidden="true">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round"><path d="M4 12h16m-6-6 6 6-6 6" /></svg>
          </div>
          <div className="flex-[0.9] bg-dark-bg p-5 text-dark-ink">
            <p className="font-mono text-[11px] uppercase tracking-[0.06em] opacity-70">Relay</p>
            <p className="mt-2 font-mono text-sm font-medium">{siteHost()}/v1</p>
            <p className="mt-1 text-[12.5px] opacity-70">鉴权 · 余额预占 · 自动路由与故障切换 · 按 token 结算</p>
          </div>
          <div className="flex items-center justify-center border-y border-line px-3 py-2 text-ink-3 sm:border-x sm:border-y-0" aria-hidden="true">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round"><path d="M4 12h16m-6-6 6 6-6 6" /></svg>
          </div>
          <div className="flex-1 p-5">
            <p className="font-mono text-[11px] uppercase tracking-[0.06em] text-ink-2">上游渠道</p>
            <p className="mt-2 font-mono text-sm font-medium">{channels.map((ch) => ch.channel).join(" · ") || "—"}</p>
            <p className="mt-1 text-[12.5px] text-ink-2">价格按实际使用的渠道计算，可传 channel 参数固定渠道</p>
          </div>
        </div>
      </section>
    </PublicShell>
  );
}
