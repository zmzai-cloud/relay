import { redirect } from "next/navigation";
import { LedgerHead } from "@/components/ledger-ui";

import { RelayShell } from "@/components/relay-shell";
import { getCurrentUser } from "@/providers/auth/session";
import { connectMongo } from "@/providers/database/mongodb/connection";
import { ApiKeyModel } from "@/providers/database/mongodb/models/apikey";

import { KeyAdminPanel } from "./key-admin-panel";
import { loginUrl } from "@/config/site-origin";

export const dynamic = "force-dynamic";

export const metadata = { title: "全部 Token · Relay admin" };


export default async function AdminKeysPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect(loginUrl("/admin/keys"));
  }
  if (user.role !== "admin") {
    redirect("/dashboard");
  }

  await connectMongo();
  const keys = await ApiKeyModel.find().sort({ createdAt: -1 }).lean();
  const safe = keys.map((k) => ({
    _id: String(k._id),
    prefix: k.prefix,
    name: k.name,
    status: k.status,
    quotaTotalTokens: k.quotaTotalTokens,
    quotaUsedTokens: k.quotaUsedTokens,
    rateLimitPerMinute: k.rateLimitPerMinute,
    allowedModels: k.allowedModels,
  }));

  return (
    <RelayShell role="admin" userName={user.name}>
      <LedgerHead eyebrow="管理后台" title="全部 Token" description={
          <>
            给调用方分发独立 key，调用方使用 <code className="font-mono text-accent">Authorization: Bearer zrk_...</code> 调用。明文 key 只在创建时显示一次。
          </>
        } />
      <div className="mt-8"><KeyAdminPanel initialKeys={safe} /></div>
    </RelayShell>
  );
}
