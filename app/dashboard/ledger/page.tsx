import { redirect } from "next/navigation";
import { Types } from "mongoose";

import { LedgerHead, ledgerNum, ledgerTh } from "@/components/ledger-ui";
import { RelayShell } from "@/components/relay-shell";
import { Pagination } from "@/components/pagination";
import { getCurrentUser } from "@/providers/auth/session";
import { loginUrl } from "@/config/site-origin";
import { connectMongo } from "@/providers/database/mongodb/connection";
import { BalanceLedgerModel } from "@/providers/database/mongodb/models/balance";
import { cnyMicrosLabel } from "@/providers/billing/currency";

const money = (value: number) => cnyMicrosLabel(value);
export const dynamic = "force-dynamic";

const kindLabel: Record<string, string> = {
  welcome_credit: "新人体验额度",
  purchase_credit: "充值到账",
  admin_credit: "管理员加款",
  admin_debit: "管理员扣减",
  usage_charge: "调用扣费",
  refund: "退款",
};

export default async function LedgerPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const sp = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect(loginUrl("/dashboard/ledger"));
  await connectMongo();
  const uid = new Types.ObjectId(user.id);
  const page = Math.max(1, Number(sp.page) || 1);
  const PAGE_SIZE = 20;
  const skip = (page - 1) * PAGE_SIZE;
  const [total, ledger] = await Promise.all([
    BalanceLedgerModel.countDocuments({ userId: uid }),
    BalanceLedgerModel.find({ userId: uid }).sort({ createdAt: -1 }).skip(skip).limit(PAGE_SIZE).lean(),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <RelayShell role="user" userName={user.name} isAdminUser={user.role === "admin"}>
      <LedgerHead eyebrow="控制台" title="账单" description="余额变动明细，按时间倒序分页展示。" />

      <div className="mt-6 overflow-x-auto rounded-lg border border-line">
        <table className="w-full min-w-[28rem] border-collapse text-sm">
          <thead>
            <tr>
              <th className={ledgerTh}>时间</th>
              <th className={ledgerTh}>类型</th>
              <th className={`${ledgerTh} text-right`}>变动</th>
            </tr>
          </thead>
          <tbody>
            {ledger.map((item) => (
              <tr key={String(item._id)} className="border-b border-line last:border-b-0 transition-colors hover:bg-surface">
                <td className="px-4 py-3 font-mono text-xs whitespace-nowrap text-ink-2">
                  {new Date(item.createdAt).toLocaleString("zh-CN")}
                </td>
                <td className="px-4 py-3 text-sm">{kindLabel[item.kind] ?? item.kind}</td>
                <td className={`${ledgerNum} font-medium ${item.amountMicros >= 0 ? "text-success" : "text-danger"}`}>
                  {item.amountMicros >= 0 ? "+" : ""}
                  {money(item.amountMicros)}
                </td>
              </tr>
            ))}
            {ledger.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-10 text-center text-sm text-ink-2">暂无账单记录。</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      <Pagination page={page} totalPages={totalPages} basePath="/dashboard/ledger" />
    </RelayShell>
  );
}
