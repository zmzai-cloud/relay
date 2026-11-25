import { model, models, Schema, type Model } from "mongoose";

/**
 * 站点设置（开源化批次 2）：单文档键值存储，文档 id 固定为 "site"。
 * 首启安装状态与品牌配置落在这里；env 仍是部署期事实源，库内值供运行时覆盖
 * （如向导里改站点名/域名后无需重新构建即可生效的场景，后续接入）。
 */
export interface SettingRecord {
  _id: string;
  installed: boolean;
  installedAt: Date | null;
  /** 品牌覆盖（null=用 env/默认值）。 */
  brand: {
    siteName: string | null;
    tagline: string | null;
    apiOrigin: string | null;
    spotPreset: "magenta" | "indigo" | "green" | null;
  };
}

const schema = new Schema<SettingRecord>(
  {
    _id: { type: String, required: true },
    installed: { type: Boolean, default: false },
    installedAt: { type: Date, default: null },
    brand: {
      siteName: { type: String, default: null },
      tagline: { type: String, default: null },
      apiOrigin: { type: String, default: null },
      spotPreset: { type: String, enum: ["magenta", "indigo", "green"], default: null },
    },
  },
  { timestamps: true, strict: "throw", _id: false },
);

export const SettingModel =
  (models.Setting as Model<SettingRecord> | undefined) ?? model<SettingRecord>("Setting", schema);
