import { redirect } from "next/navigation";
import { LedgerHead } from "@/components/ledger-ui";

import { RelayShell } from "@/components/relay-shell";
import { getCurrentUser } from "@/providers/auth/session";
import { OperationsPanel } from "../operations-panel";
import { loginUrl } from "@/config/site-origin";

export const dynamic = "force-dynamic";

export default async function OperationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect(loginUrl("/admin/operations"));
  if (user.role !== "admin") redirect("/dashboard");
  return (
    <RelayShell role="admin" userName={user.name}>
      <LedgerHead eyebrow="管理后台" title="运营调整" description="人工维护模型价目与用户余额，每次调整都会写入账本。" />
      <div className="mt-8"><OperationsPanel /></div>
    </RelayShell>
  );
}
