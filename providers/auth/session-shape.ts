/**
 * CurrentUser 形状（从原 session.ts 抽出，双 provider 共用）。
 * UserRole/UserStatus 字面量与 @zmzai/db 对齐，避免 local 模式也依赖该包。
 */
export type UserRole = "admin" | "user";
export type UserStatus = "active" | "disabled";

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  emailVerified: boolean;
}
