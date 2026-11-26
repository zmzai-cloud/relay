import Link from "next/link";
import { redirect } from "next/navigation";
import { Types } from "mongoose";

import { Badge } from "@zmzai/theme";
import { Kpi, KpiRow, LedgerHead, SectHead, ledgerNum, ledgerTh } from "@/components/ledger-ui";
import { RelayShell } from "@/components/relay-shell";
import { getCurrentUser } from "@/providers/auth/session";
import { loginUrl } from "@/config/site-origin";
import { connectMongo } from "@/providers/database/mongodb/connection";
import { BalanceAccountModel } from "@/providers/database/mongodb/models/balance";
import { UsageModel } from "@/providers/database/mongodb/models/usage";
import { cnyMicrosLabel } from "@/providers/billing/currency";
import { ensureWelcomeCredit } from "@/providers/billing/onboarding";

export const dynamic = "force-dynamic";

const money = (value: number) => cnyMicrosLabel(value);

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

function formatRelative(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const diffMs = Date.now() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "刚刚";
  if (diffMins < 60) return `${diffMins} 分钟前`;
  if (diffMins < 1440) return `${Math.floor(diffMins / 60)} 小时前`;
  if (diffMins < 43200) return `${Math.floor(diffMins / 1440)} 天前`;
  return d.toLocaleDateString("zh-CN", { month: "short", day: "numeric" });
}

/** 近 7 天逐日消费（真实聚合，无调用日为 0）。 */
async function dailySpend(userId: Types.ObjectId): Promise<Array<{ day: string; amount: number }>> {
  const since = new Date();
  since.setHours(0, 0, 0, 0);
  since.setDate(since.getDate() - 6);
  const rows = await UsageModel.aggregate<{ _id: string; amount: number }>([
    { $match: { userId, createdAt: { $gte: since }, status: "completed" } },
    { $group: { _id: { $dateToString: { format: "%m-%d", date: "$createdAt" } }, amount: { $sum: "$chargedMicros" } } },
  ]);
  const map = new Map(rows.map((r) => [r._id, r.amount]));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(since);
    d.setDate(since.getDate() + i);
    const key = `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    return { day: key, amount: map.get(key) ?? 0 };
  });
}

/** 服务端渲染的迷你折线（SVG，无客户端依赖）。 */
function Sparkline({ data }: { data: Array<{ day: string; amount: number }> }) {
  const W = 640;
  const H = 150;
  const T = 14;
  const max = Math.max(...data.map((d) => d.amount), 1);
  const x = (i: number) => (data.length === 1 ? W / 2 : (i / (data.length - 1)) * W);
  const y = (v: number) => T + (1 - v / max) * (H - 2 * T);
  const line = data.map((d, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(d.amount).toFixed(1)}`).join("");
  const area = `${line}L${x(data.length - 1).toFixed(1)},${H - T}L0,${H - T}Z`;
  const total = data.reduce((sum, d) => sum + d.amount, 0);
  if (total === 0) {
    return (
      <div className="flex h-[150px] items-center justify-center rounded-lg border border-dashed border-line text-sm text-ink-2">
        近 7 天暂无消费
      </div>
    );
  }
  return (
    <figure className="m-0">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={`近 7 天每日消费折线图，合计 ${money(total)}`}>
        <path d={area} fill="oklch(0.21 0.008 265 / 0.06)" />
        <path d={line} fill="none" stroke="var(--color-ink)" strokeWidth={1.5} />
        <circle cx={x(data.length - 1)} cy={y(data[data.length - 1].amount)} r={3} fill="var(--color-ink)" />
      </svg>
      <figcaption className="mt-2 flex justify-between font-mono text-xs text-ink-2">
        {data.map((d) => (
          <span key={d.day}>{d.day}</span>
        ))}
      </figcaption>
    </figure>
  );
}

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect(loginUrl("/dashboard"));
  const uid = new Types.ObjectId(user.id);
  await connectMongo();
  await ensureWelcomeCredit(user.id);
  const [account, usage, week] = await Promise.all([
    BalanceAccountModel.findOne({ userId: uid }).lean(),
    UsageModel.find({ userId: uid }).sort({ createdAt: -1 }).limit(8).lean(),
    dailySpend(uid),
  ]);
  const charged = usage.reduce((sum, item) => sum + item.chargedMicros, 0);
  const success = usage.filter((item) => item.status === "completed").length;
  const availableMicros = Math.max(0, (account?.balanceMicros ?? 0) - (account?.reservedMicros ?? 0));
  const weekTotal = week.reduce((sum, d) => sum + d.amount, 0);

  return (
    <RelayShell role="user" userName={user.name} isAdminUser={user.role === "admin"}>
      <LedgerHead eyebrow="控制台" title="概览" description="余额、消费与最近调用。" />

      {availableMicros === 0 ? (
        <div className="mt-5 flex items-start gap-3 rounded-lg border border-warning/40 bg-warning/10 p-4">
          <svg className="mt-0.5 h-5 w-5 shrink-0 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          <p className="text-sm text-ink-2">
            当前账户余额已用尽。
            <Link href="/dashboard/billing" className="ml-1 font-medium text-accent underline underline-offset-4">去充值</Link>
          </p>
        </div>
      ) : null}

      <KpiRow>
        <Kpi label="可用余额" value={money(availableMicros)} hint="随每次调用扣减" />
        <Kpi label="近期消费" value={money(charged)} hint={`最近 ${usage.length} 笔调用`} />
        <Kpi
          label="近期成功率"
          value={usage.length ? `${Math.round((success / usage.length) * 100)}%` : "—"}
          hint={usage.length ? `${success} / ${usage.length} 笔成功` : "暂无调用"}
        />
      </KpiRow>

      <div className="mt-10">
        <SectHead title="每日消费 · 近 7 天" />
        <div className="mt-4 rounded-lg border border-line bg-bg p-5">
          <Sparkline data={week} />
        </div>
        {weekTotal > 0 ? (
          <p className="mt-2 text-xs text-ink-2">
            7 天合计 {money(weekTotal)}
            {account ? <> · 总余额 {money(account.balanceMicros ?? 0)} / 已预留 {money(account.reservedMicros ?? 0)}</> : null}
          </p>
        ) : null}
      </div>

      <div className="mt-10">
        <SectHead title="最近调用" more={{ label: "全部记录", href: "/dashboard/activity" }} />
        <div className="mt-4 overflow-x-auto rounded-lg border border-line">
          <table className="w-full min-w-[36rem] border-collapse text-sm">
            <thead>
              <tr>
                <th className={ledgerTh}>时间</th>
                <th className={ledgerTh}>模型</th>
                <th className={ledgerTh}>状态</th>
                <th className={`${ledgerTh} text-right`}>输入</th>
                <th className={`${ledgerTh} text-right`}>输出</th>
                <th className={`${ledgerTh} text-right`}>费用</th>
              </tr>
            </thead>
            <tbody>
              {usage.map((item) => (
                <tr key={String(item._id)} className="border-b border-line last:border-b-0 transition-colors hover:bg-surface">
                  <td className="px-4 py-3 font-mono text-xs whitespace-nowrap text-ink-2">{formatRelative(item.createdAt)}</td>
                  <td className="px-4 py-3 font-mono text-xs font-medium">{item.model}</td>
                  <td className="px-4 py-3">
                    <Badge variant={statusVariant(item.status)} size="sm">{statusLabel(item.status)}</Badge>
                  </td>
                  <td className={`${ledgerNum} text-ink-2`}>{item.promptTokens.toLocaleString()}</td>
                  <td className={`${ledgerNum} text-ink-2`}>{item.completionTokens.toLocaleString()}</td>
                  <td className={`${ledgerNum} font-medium`}>{item.chargedMicros ? money(item.chargedMicros) : "¥0.00"}</td>
                </tr>
              ))}
              {usage.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-ink-2">
                    还没有调用记录。创建 <Link href="/dashboard/keys" className="text-accent underline underline-offset-4">API Key</Link> 后即可开始调用。
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </RelayShell>
  );
}
