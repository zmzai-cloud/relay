import { NextRequest, NextResponse } from "next/server";
import { internalModulesEnabled } from "@/config/internal-modules";

import { getServerEnv } from "@/config/env";
import { releaseReservation } from "@/providers/billing/service";
import { connectMongo } from "@/providers/database/mongodb/connection";
import { BalanceReservationModel } from "@/providers/database/mongodb/models/reservation";
import { UsageModel } from "@/providers/database/mongodb/models/usage";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!internalModulesEnabled()) return NextResponse.json({ code: "INTERNAL_MODULE_DISABLED", error: "内部端点未启用" }, { status: 404 });
  const secret = getServerEnv().RELAY_INTERNAL_CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "未授权" }, { status: 401 });
  await connectMongo();
  const stale = await BalanceReservationModel.find({ status: "held", expiresAt: { $lte: new Date() } }).select("usageId").limit(100).lean();
  for (const reservation of stale) {
    await releaseReservation(reservation.usageId);
    await UsageModel.updateOne({ _id: reservation.usageId, status: "processing" }, { $set: { status: "unsettled", lastError: "reservation lease expired" } });
  }
  return NextResponse.json({ reconciled: stale.length });
}
