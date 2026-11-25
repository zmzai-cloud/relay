import { connectMongo } from "@/providers/database/mongodb/connection";
import { SettingModel, type SettingRecord } from "@/providers/database/mongodb/models/setting";

const SITE_DOC_ID = "site";

export interface BrandInput {
  siteName?: string | null;
  tagline?: string | null;
  apiOrigin?: string | null;
  spotPreset?: "magenta" | "indigo" | "green" | null;
}

const emptySettings = (): SettingRecord => ({
  _id: SITE_DOC_ID,
  installed: false,
  installedAt: null,
  brand: { siteName: null, tagline: null, apiOrigin: null, spotPreset: null },
});

/** 读站点设置；未初始化时返回「未安装」默认值。 */
export async function getSiteSettings(): Promise<SettingRecord> {
  await connectMongo();
  const doc = await SettingModel.findById(SITE_DOC_ID).lean<SettingRecord | null>();
  return doc ?? emptySettings();
}

/**
 * 是否已完成首启安装。读取失败一律按「已安装」处理：
 * 故障时宁可让 /setup 不可达，也不能把未设防的安装入口暴露出去。
 */
export async function isInstalled(): Promise<boolean> {
  try {
    return (await getSiteSettings()).installed;
  } catch {
    return true;
  }
}

/** 写入品牌覆盖。整体替换 brand 对象（未传的键回落为 null=用默认值）。 */
export async function updateBrand(input: BrandInput): Promise<SettingRecord> {
  await connectMongo();
  const doc = await SettingModel.findByIdAndUpdate(
    SITE_DOC_ID,
    {
      $set: {
        brand: {
          siteName: input.siteName ?? null,
          tagline: input.tagline ?? null,
          apiOrigin: input.apiOrigin ?? null,
          spotPreset: input.spotPreset ?? null,
        },
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  ).lean<SettingRecord>();
  return doc!;
}

/** 标记安装完成。幂等：重复调用保留首次安装时间。 */
export async function markInstalled(): Promise<SettingRecord> {
  await connectMongo();
  const now = new Date();
  const doc = await SettingModel.findByIdAndUpdate(
    SITE_DOC_ID,
    [{ $set: { installed: true, installedAt: { $ifNull: ["$installedAt", now] } } }],
    { upsert: true, new: true, setDefaultsOnInsert: true },
  ).lean<SettingRecord>();
  return doc!;
}
