import { Schema, model } from "mongoose";

import { connectMongo } from "@/providers/database/mongodb/connection";

/**
 * local 模式用户表（开源化批次 2）：独立于 zmzai 共享用户库。
 * 首个管理员由安装向导创建；密码存 argon2id 哈希。
 */
const LocalUserSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, required: true, default: "" },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["admin", "user"], default: "user" },
    status: { type: String, enum: ["active", "disabled"], default: "active" },
    emailVerified: { type: Boolean, default: true }, // 自部署：注册即视为已验证
  },
  { timestamps: true },
);

export interface LocalUserDocument {
  _id: { toString(): string };
  email: string;
  name: string;
  passwordHash: string;
  role: "admin" | "user";
  status: "active" | "disabled";
  emailVerified: boolean;
}

export async function getLocalUserModel() {
  await connectMongo();
  return model("LocalUser", LocalUserSchema);
}
