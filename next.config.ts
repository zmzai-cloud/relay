import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Docker 自托管（开源化批次 2）：产物自含 server.js + 精简 node_modules
  output: "standalone",
  // 私有 TS 包，需显式转译（@zmzai/contracts 已内联，见 providers/telemetry/contracts.ts）
  transpilePackages: ["@zmzai/db", "@zmzai/theme"],
  // OpenAI 兼容：标准 /v1/* 路径映射到内部 /api/v1/*
  // 让 zcode、codex 等工具可以用 https://m.zmzai.cloud/v1 作为 base URL
  async rewrites() {
    return [
      { source: "/v1/chat/completions", destination: "/api/v1/chat/completions" },
      { source: "/v1/models", destination: "/api/v1/models" },
      { source: "/v1/responses", destination: "/api/responses" },
    ];
  },
  webpack: (config) => {
    config.resolve.extensionAlias = {
      ...(config.resolve.extensionAlias ?? {}),
      ".js": [".ts", ".tsx", ".js"],
      ".mjs": [".mts", ".mjs"],
    };
    return config;
  },
};
export default nextConfig;
