import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  oxc: { jsx: { runtime: "automatic" } },
  resolve: { alias: { "@": fileURLToPath(new URL(".", import.meta.url)) } },
  // .worktrees/ 是历史开发用 git worktree（同名测试的旧副本），扫进来会产生
  // 整套幻影失败并拖垮运行时间；node_modules 已在 vitest 默认排除里。
  test: { exclude: ["**/node_modules/**", "**/dist/**", ".worktrees/**"] },
});
