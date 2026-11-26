import { redirect } from "next/navigation";
import { LedgerHead } from "@/components/ledger-ui";
import { RelayShell } from "@/components/relay-shell";
import { getCurrentUser } from "@/providers/auth/session";
import { connectMongo } from "@/providers/database/mongodb/connection";
import { ApiKeyModel } from "@/providers/database/mongodb/models/apikey";
import { ModelPriceModel } from "@/providers/database/mongodb/models/model-price";
import { TokenPanel } from "../token-panel";
import { loginUrl } from "@/config/site-origin";

export const dynamic = "force-dynamic";

export default async function KeysPage() {
  const user = await getCurrentUser();
  if (!user) redirect(loginUrl("/dashboard/keys"));
  await connectMongo();
  const [keys, models] = await Promise.all([ApiKeyModel.find({ userId: user.id }).sort({ createdAt: -1 }).lean(), ModelPriceModel.find({ enabled: true }).sort({ model: 1 }).lean()]);
  return (
    <RelayShell role="user" userName={user.name} isAdminUser={user.role === "admin"}>
      <LedgerHead
        eyebrow="控制台"
        title="API Keys"
        description="创建和管理调用凭证。Key 可随时吊销，可为每个 Key 设置模型范围与消费上限。完整 Key 仅在创建时显示一次。"
      />
      <div className="mt-6">
        <TokenPanel
          initialKeys={keys.map((key) => ({ _id: String(key._id), prefix: key.prefix, name: key.name, status: key.status, rateLimitPerMinute: key.rateLimitPerMinute, monthlySpendLimitMicros: key.monthlySpendLimitMicros, monthlySpendUsedMicros: key.monthlySpendUsedMicros, lastUsedAt: key.lastUsedAt?.toISOString() ?? null }))}
          models={models.map((model) => model.model)}
        />
      </div>
    </RelayShell>
  );
}
