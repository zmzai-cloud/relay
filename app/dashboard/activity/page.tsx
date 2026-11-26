import Link from "next/link";
import { redirect } from "next/navigation";
import { Types } from "mongoose";

import { Badge } from "@zmzai/theme";
import { LedgerHead, ledgerNum, ledgerTh } from "@/components/ledger-ui";
import { RelayShell } from "@/components/relay-shell";
import { Pagination } from "@/components/pagination";
import { getCurrentUser } from "@/providers/auth/session";
import { loginUrl } from "@/config/site-origin";
import { connectMongo } from "@/providers/database/mongodb/connection";
import { UsageModel } from "@/providers/database/mongodb/models/usage";
import { cnyMicrosLabel } from "@/providers/billing/currency";

const money = (value: number) => cnyMicrosLabel(value);
export const dynamic = "force-dynamic";

const statusVariant = (status: string): "success" | "danger" | "warning" | "outline" => {
  if (status === "completed") return "success";
  if (status === "failed") return "danger";
  if (status === "unsettled") return "warning";
  return "outline";
};
const statusLabel = (status: string): string => {
  if (status === "completed") return "成功";
  if (status === "failed") return "失败";
  if (status === "unsettled") return "待结算";
  return status;
};

const FILTERS: Array<{ key: string; label: string }> = [
  { key: "", label: "全部" },
  { key: "completed", label: "成功" },
  { key: "failed", label: "失败" },
  { key: "unsettled", label: "待结算" },
];

export default async function ActivityPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string }>;
}) {
  const sp = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect(loginUrl("/dashboard/activity"));
  await connectMongo();
  const uid = new Types.ObjectId(user.id);
  const status = FILTERS.some((f) => f.key === (sp.status ?? "")) ? sp.status : undefined;
  const page = Math.max(1, Number(sp.page) || 1);
  const PAGE_SIZE = 20;
  const skip = (page - 1) * PAGE_SIZE;
  const filter = status ? { userId: uid, status } : { userId: uid };
  const [total, usages] = await Promise.all([
    UsageModel.countDocuments(filter),
    UsageModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(PAGE_SIZE).lean(),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const qs = status ? `&status=${status}` : "";

  return (
    <RelayShell role="user" userName={user.name} isAdminUser={user.role === "admin"}>
      <LedgerHead eyebrow="控制台" title="用量" description="调用记录与费用，按时间倒序分页展示。费用按实际使用渠道的单价结算。" />

      <div className="mt-5 flex flex-wrap gap-1.5" role="group" aria-label="状态筛选">
        {FILTERS.map((f) => {
          const active = (sp.status ?? "") === f.key;
          const href = f.key ? `/dashboard/activity?status=${f.key}` : "/dashboard/activity";
          return (
            <Link
              key={f.label}
              href={href}
              aria-current={active ? "true" : undefined}
              className={`rounded-full border px-3 py-1 text-[13px] transition-colors ${
                active ? "border-accent bg-accent text-accent-ink" : "border-line text-ink-2 hover:border-line-strong hover:text-ink"
              }`}
            >
              {f.label}
            </Link>
          );
        })}
      </div>

      <div className="mt-4 overflow-x-auto rounded-lg border border-line">
        <table className="w-full min-w-[44rem] border-collapse text-sm">
          <thead>
            <tr>
              <th className={ledgerTh}>时间</th>
              <th className={ledgerTh}>模型</th>
              <th className={ledgerTh}>状态</th>
              <th className={`${ledgerTh} text-right`}>输入</th>
              <th className={`${ledgerTh} text-right`}>缓存读</th>
              <th className={`${ledgerTh} text-right`}>输出</th>
              <th className={`${ledgerTh} text-right`}>费用</th>
            </tr>
          </thead>
          <tbody>
            {usages.map((u) => (
              <tr key={String(u._id)} className="border-b border-line last:border-b-0 transition-colors hover:bg-surface">
                <td className="px-4 py-3 font-mono text-xs whitespace-nowrap text-ink-2">
                  {new Date(u.createdAt).toLocaleString("zh-CN")}
                </td>
                <td className="px-4 py-3 font-mono text-xs font-medium">{u.model}</td>
                <td className="px-4 py-3">
                  <Badge variant={statusVariant(u.status)} size="sm">{statusLabel(u.status)}</Badge>
                  {u.lastError ? <p className="mt-1 text-[11px] leading-4 text-danger">{u.lastError}</p> : null}
                </td>
                <td className={`${ledgerNum} text-ink-2`}>{u.promptTokens.toLocaleString()}</td>
                <td className={`${ledgerNum} text-ink-2`}>{u.cacheReadTokens ? u.cacheReadTokens.toLocaleString() : "—"}</td>
                <td className={`${ledgerNum} text-ink-2`}>{u.completionTokens.toLocaleString()}</td>
                <td className={`${ledgerNum} font-medium`}>{u.chargedMicros ? money(u.chargedMicros) : "¥0.00"}</td>
              </tr>
            ))}
            {usages.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-sm text-ink-2">
                  {status ? "该状态下暂无调用记录。" : <>还没有调用记录。创建 <Link href="/dashboard/keys" className="text-accent underline underline-offset-4">API Key</Link> 后即可开始调用。</>}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      <Pagination page={page} totalPages={totalPages} basePath="/dashboard/activity" query={qs} />
    </RelayShell>
  );
}
