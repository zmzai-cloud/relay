# Relay

**自托管的 LLM API 中转站** —— OpenAI 兼容入口、多渠道路由、按 token 计费。

[![deploy](https://github.com/zmzai-cloud/relay/actions/workflows/deploy.yml/badge.svg)](https://github.com/zmzai-cloud/relay/actions/workflows/deploy.yml)
[![docker](https://github.com/zmzai-cloud/relay/actions/workflows/docker.yml/badge.svg)](https://github.com/zmzai-cloud/relay/actions/workflows/docker.yml)
[![release](https://github.com/zmzai-cloud/relay/actions/workflows/release.yml/badge.svg)](https://github.com/zmzai-cloud/relay/actions/workflows/release.yml)
[![License: Apache-2.0](https://img.shields.io/badge/License-Apache--2.0-blue.svg)](LICENSE)

> Self-hosted LLM API relay: an OpenAI-compatible gateway with multi-channel
> routing, token-level billing and a first-boot setup wizard.
> [English summary](#english-summary) at the end.

## 它是什么

把多个上游模型渠道收敛成**一个 OpenAI 兼容端点**：

```
OpenAI SDK / zcode / codex / 任何 OpenAI 协议客户端
        │  baseURL 换成 https://your-domain/v1
        ▼
┌──────────────────────────────────────────────┐
│ Relay：鉴权 · 余额预占 · 自动路由 · 按 token 结算 │
└──────────────────────────────────────────────┘
        │ 按优先级故障切换
        ▼
   上游渠道（任意 OpenAI 兼容服务）
```

任何说 OpenAI 协议的工具，改一行 baseURL 即可接入；你在 Relay 侧决定
有哪些模型、多少钱、走哪条渠道。

## 特性

- **OpenAI 双兼容**：`/v1/chat/completions`（含 SSE 流式）与 `/v1/responses`
  兼容层；`GET /v1/models` 按调用者权限返回可用模型
- **多渠道路由**：优先级排序、失败自动切换；渠道-模型级健康隔离
  （单个模型失败不暂停同渠道其他模型）、冷却与恢复探测
- **按 token 计费**：输入/输出/缓存读分列计价；调用前预占、结束按实际
  用量结算；余额账本与毛利报表（收入/上游成本/毛利率，按模型与渠道聚合）
- **API Key 管理**：`zrk_` 前缀 Key、模型范围、限速、月消费上限、随时吊销
- **人工收款流**：用户申请额度 → 5 分钟申请码 → 管理员核对到账确认入账
  （在线支付接入点已预留 `PaymentProvider` 接口）
- **首启安装向导**：`docker compose up` 后 `/setup` 五步完成
  管理员/品牌/首条渠道；白标（站点名/域名/点睛色）
- **双认证档**：`local`（argon2id + 无状态 HMAC 会话）或对接外部 SSO
- **运维台账**：全链路审计日志、渠道双段探测（连通 + 真实推理）、
  待核查成本对账

## 快速开始

```bash
git clone https://github.com/zmzai-cloud/relay.git && cd relay
cp .env.example .env        # 至少改 AUTH_SECRET（32+ 随机串）
docker compose up -d
```

浏览器打开 `http://localhost:3000/setup`：创建管理员 → 设置站点品牌 →
（完成安装后）用「添加模型引导」接入第一条上游渠道并定价。

然后即可调用：

```bash
curl http://localhost:3000/v1/chat/completions \
  -H "Authorization: Bearer zrk_你的Key" \
  -H "Content-Type: application/json" \
  -d '{"model":"你的模型名","messages":[{"role":"user","content":"你好"}]}'
```

> 预构建镜像：`ghcr.io/zmzai-cloud/relay:latest`（compose 默认本地构建；
> 镜像包公开后可解注释 compose 中的 image 行直接拉取）。
> 注意 compose 里的 MongoDB 以单节点副本集运行——计费核销与
> 渠道发布走事务，需要 replSet。

## 部署形态（Deploy Profile）

| 维度 | 选项 | 说明 |
| --- | --- | --- |
| 认证 | `local`（默认）/ 外部 SSO | local=本站账号密码；SSO 适配器模式见 `providers/auth/` |
| 支付 | `manual`（默认） | 申请码+人工核销；epay/stripe 接口已预留 |
| 品牌 | `BRAND_SITE_TITLE` 等 | 站点名/描述/对外域名/点睛色全配置驱动 |
| 数据 | MongoDB | 自带 compose；也可用外部实例（需支持事务） |

全部环境变量见 [.env.example](.env.example)，架构与接缝设计见
[docs/open-product-architecture.md](docs/open-product-architecture.md)。

## 与 one-api / new-api 的差异

同类开源项目（one-api / new-api）已验证这个品类；Relay 的不同点：

1. **现代栈与台账设计**：Next.js 15 + React 19，运营后台是高密度工程台账
   （等宽数字、渠道健康度、毛利口径明示）
2. **工程细节**：OpenAI Responses API 兼容层、渠道双段探测、
   渠道-模型级健康隔离、待核查成本对账、操作审计
3. **AI Coding 友好**：`reasoning_effort` 透传、长上下文模型支持、
   zcode/codex 等编码工具换 baseURL 即用

## 开发

```bash
corepack pnpm install
corepack pnpm dev        # 本地开发（需 MONGODB_URI/AUTH_SECRET）
corepack pnpm test       # vitest（需要 Node ≥ 26 与本地 mongod）
corepack pnpm typecheck
```

CI（`.github/workflows/docker.yml`）每次 push 会做完整的容器级验证：
构建镜像 → 副本集 Mongo → 首启安装 → 登录 → 门控断言。

## Roadmap

- [ ] 在线支付（易支付 / Stripe，`PaymentProvider` 插件位已留）
- [ ] 邮件通知（余额告警 / 订单）
- [ ] 多管理员 RBAC
- [ ] 上游渠道预设库（常用供应商一键模板）

## License

[Apache-2.0](LICENSE)

---

## English Summary

**Relay** is a self-hosted LLM API relay/gateway:

- **OpenAI-compatible**: `/v1/chat/completions` (SSE streaming) and a
  `/v1/responses` compatibility layer — point any OpenAI SDK at it.
- **Multi-channel routing**: priority-based failover with per-model health
  isolation, cooldowns and recovery probes.
- **Token-level billing**: reservation → settlement, per-model pricing,
  ledger and margin reports (revenue / upstream cost / margin).
- **API keys**: scoping, rate limits, monthly spend caps, revocation.
- **First-boot wizard**: `docker compose up`, open `/setup`, done.
  White-label site name / domain / accent color.
- **Auth profiles**: built-in local auth (argon2id + stateless HMAC
  sessions) or adapt an external SSO.

Quick start:

```bash
cp .env.example .env   # set AUTH_SECRET (32+ random chars)
docker compose up -d
# open http://localhost:3000/setup
```

Requires a MongoDB replica set for transactional settlement (the bundled
compose handles this). Apache-2.0 licensed.
