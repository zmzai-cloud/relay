import Link from "next/link";
import { PageHeader, Terminal } from "@zmzai/theme";
import { PublicShell } from "@/components/public-shell";
import { connectMongo } from "@/providers/database/mongodb/connection";
import { getCurrentUser } from "@/providers/auth/session";
import { apiUrl } from "@/config/site-origin";

export const dynamic = "force-dynamic";

export const metadata = { title: "API 文档 · Relay" };

const BASE = `${apiUrl("/v1/chat/completions")}`;

export default async function PublicDocsPage() {
  const user = await getCurrentUser();
  await connectMongo();
  return (
    <PublicShell user={user} isAdminUser={user?.role === "admin"}>
      <div className="max-w-4xl">
        <PageHeader
          icon="book"
          eyebrow="接口参考"
          title="API 文档"
          description={
            <>
              Relay 兼容 OpenAI Chat Completions 协议：把 baseURL 指向 <code className="font-mono text-xs">{apiUrl("/v1")}</code>，用 API Key 鉴权即可。zcode、codex 等第三方工具直接使用此地址。模型与价格见 <Link href="/models" className="text-accent underline underline-offset-4">模型列表</Link>。
            </>
          }
        />

        <div className="mt-8 grid gap-12 lg:grid-cols-[180px_minmax(0,1fr)]">
          <nav className="hidden lg:block" aria-label="文档目录">
            <div className="sticky top-20">
              <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.06em] text-ink-2">目录</p>
              <ul>
                {["鉴权", "非流式请求", "流式请求", "渠道路由", "推理强度", "计费", "上游异常与重试"].map((t, i) => (
                  <li key={t}>
                    <a href={`#doc-${i + 1}`} className="flex items-baseline border-l-2 border-l-transparent -ml-[2px] py-1 pl-3 text-[13px] text-ink-2 transition-colors hover:border-l-rule hover:text-ink">
                      <span className="mr-2 font-mono text-[11px] text-ink-3">{String(i + 1).padStart(2, "0")}</span>
                      {t}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </nav>
          <div>

        <h2 id="doc-1" className="mt-10 scroll-mt-20 border-b border-rule pb-2 text-base font-semibold">1. 鉴权</h2>
        <p className="mt-2 text-sm leading-6 text-ink-2">
          在控制台创建 API Key 后，通过 <code className="font-mono text-xs">Authorization: Bearer &lt;YOUR_API_KEY&gt;</code> 请求头传入。Key 可随时吊销，每次调用按 token 实时计费。
        </p>

        <h2 id="doc-2" className="mt-10 scroll-mt-20 border-b border-rule pb-2 text-base font-semibold">2. 非流式请求</h2>
        <div className="mt-3">
          <Terminal title="curl — 非流式">
            <span>{`curl ${BASE} \\
  -H "Authorization: Bearer <YOUR_API_KEY>" \\
  -H "Content-Type: application/json" \\
  -d '{"model":"YOUR_MODEL_ID","messages":[{"role":"user","content":"你好"}]}'`}</span>
          </Terminal>
        </div>

        <h2 id="doc-3" className="mt-10 scroll-mt-20 border-b border-rule pb-2 text-base font-semibold">3. 流式请求</h2>
        <p className="mt-2 text-sm leading-6 text-ink-2">
          请求体增加 <code className="font-mono text-xs">&quot;stream&quot;: true</code>，服务端返回 SSE 数据流，末尾的 usage 事件携带本次调用的 token 统计。
        </p>
        <div className="mt-3">
          <Terminal title="curl — 流式">
            <span>{`curl -N ${BASE} \\
  -H "Authorization: Bearer <YOUR_API_KEY>" \\
  -H "Content-Type: application/json" \\
  -d '{"model":"YOUR_MODEL_ID","stream":true,"messages":[{"role":"user","content":"你好"}]}'`}</span>
          </Terminal>
        </div>

        <h2 id="doc-4" className="mt-10 scroll-mt-20 border-b border-rule pb-2 text-base font-semibold">4. 渠道路由</h2>
        <p className="mt-2 text-sm leading-6 text-ink-2">
          默认按模型自动选择上游渠道，失败时尝试其他可用渠道。价格按最终使用的渠道计算，不同渠道的价格可能不同；需要固定渠道时，在请求体传入 <code className="font-mono text-xs">&quot;channel&quot;: &quot;渠道名&quot;</code>。
        </p>

        <h2 id="doc-5" className="mt-10 scroll-mt-20 border-b border-rule pb-2 text-base font-semibold">5. 推理强度</h2>
        <p className="mt-2 text-sm leading-6 text-ink-2">
          支持 <code className="font-mono text-xs">reasoning_effort</code> 参数（low / medium / high，各模型支持范围见模型详情页）。DeepSeek 的思考相关参数可随请求体透传。
        </p>

        <h2 id="doc-6" className="mt-10 scroll-mt-20 border-b border-rule pb-2 text-base font-semibold">6. 计费</h2>
        <p className="mt-2 text-sm leading-6 text-ink-2">
          按 token 计费：输入、输出分别计价，缓存价格未单独配置时按输入价结算。调用前按预估用量预占额度，结束后按实际用量和所用渠道价格结算；余额与每笔账单可在控制台「用量与账单」核对。
        </p>
        <h2 id="doc-7" className="mt-10 scroll-mt-20 border-b border-rule pb-2 text-base font-semibold">7. 上游异常与重试</h2>
        <p className="mt-2 text-sm leading-6 text-ink-2">
          上游短时限流返回 <code>UPSTREAM_RATE_LIMITED</code>；周/月额度用尽返回 <code>UPSTREAM_QUOTA_EXHAUSTED</code>；上游余额或鉴权异常分别返回 <code>UPSTREAM_BALANCE</code> 和 <code>UPSTREAM_AUTH</code>。如响应包含 <code>Retry-After</code>，请等待指定秒数后再试；该时间只是下次尝试时间，并不保证上游已恢复。
        </p>
      </div>
    </div>
        </div>
      </PublicShell>
  );
}
