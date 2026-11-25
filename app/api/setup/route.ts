import { NextResponse } from "next/server";
import { z } from "zod";

import { getServerEnv } from "@/config/env";
import { connectMongo } from "@/providers/database/mongodb/connection";
import { SettingModel } from "@/providers/database/mongodb/models/setting";
import { localProvider } from "@/providers/auth/local/provider";
import { getLocalUserModel } from "@/providers/auth/local/user-model";

export const dynamic = "force-dynamic";

/**
 * 首启安装（开源化批次 2）：创建首个管理员 + 写品牌 + 标记已安装，一次请求原子完成。
 *
 * 安全约束：
 * - 仅 AUTH_PROVIDER=local 可用（zmzai_sso 的管理员来自共享用户库，不走这里）；
 * - 仅未安装时可用（已安装一律 409，且先于参数校验——不给探测面）；
 * - 以「库内无任何用户」为准而不是仅看 installed 标志：即便 settings 文档丢失，
 *   只要已有用户就不允许再造管理员；
 * - 并发首启靠 LocalUser.email 唯一索引 + settings upsert 两条路径都只放行一个。
 */
const setupSchema = z
  .object({
    admin: z.object({
      email: z.string().trim().toLowerCase().email().max(254),
      password: z.string().min(8).max(200),
    }),
    brand: z.object({
      siteName: z.string().trim().min(1).max(40),
      apiOrigin: z
        .string().trim()
        .regex(/^https:\/\/[a-z0-9.-]+(:\d+)?$/i, "对外域名需形如 https://api.example.com"),
      spotPreset: z.enum(["magenta", "indigo", "green"]).default("magenta"),
    }),
  })
  .strict();

const json = (error: string, status: number, code?: string) =>
  NextResponse.json({ error, ...(code ? { code } : {}) }, { status });

export async function GET() {
  if (getServerEnv().AUTH_PROVIDER !== "local") {
    return json("当前部署使用外部认证，无需安装向导", 404, "SETUP_NOT_APPLICABLE");
  }
  let installed: boolean;
  try {
    await connectMongo();
    const doc = await SettingModel.findById("site").select("installed").lean<{ installed?: boolean } | null>();
    installed = Boolean(doc?.installed);
  } catch {
    // 库不可达：不暴露安装状态，按「暂不可用」处理
    return json("暂时无法确认安装状态", 503, "SETUP_STATUS_UNAVAILABLE");
  }
  return NextResponse.json({ installed, provider: "local" });
}

export async function POST(request: Request) {
  if (getServerEnv().AUTH_PROVIDER !== "local") {
    return json("当前部署使用外部认证，无需安装向导", 404, "SETUP_NOT_APPLICABLE");
  }

  const parsed = setupSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return json("安装参数不正确（需管理员邮箱、至少 8 位密码、站点名与 https 域名）", 400, "INVALID_BODY");
  }

  try {
    await connectMongo();

    // 双重门：已安装，或库里已有任何用户 → 都不再开放安装
    const [site, existingUser] = await Promise.all([
      SettingModel.findById("site").select("installed").lean<{ installed?: boolean } | null>(),
      getLocalUserModel().then((m) => m.exists({})),
    ]);
    if (site?.installed || existingUser) {
      return json("本站已完成安装", 409, "ALREADY_INSTALLED");
    }

    const { admin, brand } = parsed.data;
    const user = await localProvider.createUser({
      email: admin.email,
      password: admin.password,
      role: "admin",
      name: "Admin",
    });

    await SettingModel.findByIdAndUpdate(
      "site",
      {
        $set: {
          installed: true,
          installedAt: new Date(),
          brand: { siteName: brand.siteName, tagline: null, apiOrigin: brand.apiOrigin, spotPreset: brand.spotPreset },
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    // 安装完成即登录，免二次输入
    await localProvider.issueSessionCookie(user.id);
    return NextResponse.json({ ok: true, user: { name: user.name, email: user.email, role: user.role } });
  } catch (e) {
    // 邮箱唯一索引冲突 → 并发首启或重复提交
    if ((e as { code?: number }).code === 11000) {
      return json("本站已完成安装", 409, "ALREADY_INSTALLED");
    }
    throw e;
  }
}
