# Relay 开源化与通用产品架构（V3 方案）

> 状态：设计定稿待评审 · 2026-11-21 · 配套原型 `原型/V3 relay-可交互原型.html`
>
> 决策：**先开源自托管产品**（任何人 `docker compose up` 即可运行），zmzai 作为参考部署
> （reference deployment）；托管多租户 SaaS 列为 P3 可选，不进第一阶段的架构负担。

## 1. 目标与非目标

**目标**
- 通用：不带 zmzai 账号体系也能独立运行；品牌（站点名/logo/点睛色/域名）全配置驱动（白标）。
- zmzai 零损失：relay.zmzai.cloud 继续使用共享 SSO、micros 记账、agent/sandbox 内部端点、云朵标。
- 引擎不重写：渠道路由/计费账本/Key 体系/毛利报表/审计/运营台账 UI 原样保留。

**非目标（第一阶段）**
- 多租户 SaaS（租户隔离、自助开通、聚合计费）。
- 非 OpenAI 协议上游（Anthropic 原生、Bedrock 等）——接口预留 `protocol` 字段，实现后置。
- 自动化汇率/多币种——计费恒为 CNY micros（1M micros = ¥8）。

## 2. 五条接缝（Seams）

现有 zmzai 耦合全部收敛到五个可替换模块，其余代码不感知部署形态。

### 2.1 AuthProvider —— 认证

```ts
interface AuthProvider {
  id: "local" | "zmzai-sso";
  // 登录页路由：local 渲染本站表单；zmzai-sso 302 到 auth.zmzai.cloud
  loginRedirect(next: string): Response | Renderable;
  // 会话解析：local 读本站 HttpOnly cookie（JWT，库内签发）；
  // zmzai-sso 读共享会话 cookie 并校验 auth 域签名
  getCurrentUser(): Promise<User | null>;
  createUser(input: { email: string; password: string; role?: Role }): Promise<User>; // 仅 local
}
```

- **local（默认）**：User/Session 落本站 Mongo（独立集合 `users`，替换现用的 `@zmzai/db` 共享
  UserModel）；密码argon2id；首个管理员由安装向导创建（角色 `admin`）。
- **zmzai-sso**：保持现状（auth.zmzai.cloud 共享 Cookie + 共享用户库），包装为适配器。
- 切换：`AUTH_PROVIDER=local|zmzai_sso`，运行时通过 profile 解析，不做热切换。

### 2.2 PaymentProvider —— 支付

```ts
interface PaymentProvider {
  id: "manual" | "epay" | "stripe";
  // 创建充值单：manual 生成 5 分钟申请码（现状）；epay/stripe 返回跳转/支付参数
  createOrder(user: User, product: WalletProduct): Promise<Order>;
  // 确认到账：manual 由管理员后台确认；在线支付走回调 webhook 自动 confirm
  confirm(order: Order, evidence?: string): Promise<LedgerEntry>;
}
```

- **manual（默认，即现状）**：申请码 → 微信收款 → 管理员确认，计费 micros 不变。
- **epay（易支付）**：P2 首个在线支付实现——中转站场景事实标准，个人可接。
- **stripe**：P2/P3，面向海外部署。
- 订单状态机（pending/submitted/completed/rejected/expired）与账本入口复用现有实现。

### 2.3 InternalModules —— zmzai 私有端点

`/api/internal/agent/*`、`/api/internal/sandbox/*` 移入 `modules/zmzai/`，由
`ENABLE_ZMZAI_INTERNAL=true` 显式启用（默认 false，开源发行版不出现在路由表）。
内部鉴权沿用服务密钥，不走 AuthProvider。

### 2.4 BrandConfig —— 品牌（白标）

```ts
interface BrandConfig {
  siteName: string;        // 默认 "Relay"；zmzai = "Margin"
  logo: "relay" | "cloud"; // 中性路由标 / zmzai 云朵标（SVG 内置两枚，也支持自定义 URL）
  domain: string;          // 对外 API 域名，写入文档页与终端示例
  spotPreset: "magenta" | "indigo" | "green" | { strong; base; soft; deep }; // 点睛色阶
}
```

落点：安装向导写入 DB（`settings` 集合）+ 服务端注入 `:root` CSS 变量与页面元数据；
文档页/终端示例中的 baseURL 一律从该配置渲染（V3 原型已演示该联动）。

### 2.5 DeployProfile —— 部署档案

```ini
# .env（Docker Compose 注入）
AUTH_PROVIDER=local            # zmzai 部署填 zmzai_sso
PAYMENT_PROVIDER=manual        # zmzai: manual；在线支付后续可选
ENABLE_ZMZAI_INTERNAL=false    # zmzai: true
BRAND_SITE=Relay               # zmzai: Margin
BRAND_LOGO=relay               # zmzai: cloud
PUBLIC_API_DOMAIN=api.example.com
MONGO_URI=mongodb://relay:27017/relay
SESSION_SECRET=...             # local JWT 签发密钥
```

`profile = f(env)` 在启动时解析一次；zmzai 的生产即本档案的一组取值，无代码分支。

## 3. 开源阻断项与依赖处置

| 依赖 | 问题 | 处置 |
| --- | --- | --- |
| `@zmzai/contracts` | 私有 GitHub 依赖，外部装不了 | 反查引用面（错误码/类型），若仅类型则内联进 `src/contracts/`；否则发布公开 npm 包（org=zmzai 已具备发布通道） |
| `@zmzai/db`（UserModel） | 共享用户库，local 不需要 | local 模式用本站 `users` 集合；该依赖移入 zmzai profile 的适配器内 |
| `@zmzai/theme` | 公开 npm 包 | 保留直接依赖（0.9.x）；点睛色阶 token 由 BrandConfig 覆盖 |
| 硬编码域名 `m/relay.zmzai.cloud` | 散落约 8 处 | 全部改读 `PUBLIC_API_DOMAIN`/BrandConfig（V3 原型已验证文案层联动） |
| memory/（K1 集成） | zmzai 私有 | 随 InternalModules 一起走 `ENABLE_ZMZAI_INTERNAL` 开关 |

协议：`package.json` 已是 Apache-2.0，维持；不引入 CLA，DCO 可选。

## 4. 安装向导（首启流程）

`/setup` 仅在 `settings.installed = false` 时可达，五步（V3 原型即此交互）：
欢迎 → 管理员账号（local 模式必填；zmzai_sso 模式此步显示「用 SSO 管理员首次登录即完成」）
→ 品牌（站点名/域名/点睛色，即时预览）→ 首条渠道（含双段测试）→ 完成摘要并落库。
完成后强制跳转登录/控制台，`installed` 置 true。

## 5. Docker 与部署形态

- 单镜像（Next.js standalone）+ compose：`app` + `mongo` 两个服务，`.env.example` 全量注释。
- 健康检查走现有 `/api/health`；数据卷挂 `/data/db`。
- 升级路径：镜像版本化，Mongo 无破坏性迁移承诺（Mongoose 现有模型已向后兼容）。

## 6. 路线图

| 阶段 | 内容 | 量级 |
| --- | --- | --- |
| P1 解耦 | 五条接缝落地、local 认证、安装向导、品牌配置、Docker 化、域名/文案去硬编码 | 1–1.5 周 |
| P2 通用能力 | 易支付插件、邮件通知（余额告警/订单）、多管理员 RBAC、模型供应商预设库、文档站 | 1–2 周 |
| P3 产品化 | GitHub 开源发布（README/一键部署徽章/demo 站）、示例库、（可选）多租户 SaaS 评估 | 0.5–1 周 + 运营 |

## 7. 竞品与差异化

品类被 one-api / new-api（开源，star 数万）统治。切入理由：
1. **现代栈与台账设计**：Next.js 15 + 运营台账 UI（new-api 最大痛点即 UI）；
2. **工程细节**：Responses API 兼容层、双段探测、渠道-模型级健康隔离、待核查成本对账、审计日志；
3. **AI Coding 友好**：GLM Coding Plan 端点适配、reasoning_effort、zcode/codex 换 baseURL 即用。
风险：one-api 生态惯性（渠道模板社区贡献）；对策——渠道预设库（P2）降低迁移成本，
文档站提供 new-api 导入对照表。

## 8. 与 zmzai 的契约（回归清单）

开源化合并回 main 后，zmzai 部署必须逐项验证：
共享 SSO 登录/登出、micros 记账与账本、agent/sandbox 内部端点鉴权、
welcome credit、admin 后台全链（订单确认→余额、划拨→资金池）、
品牌回云朵标/Margin、`relay.zmzai.cloud` 域名渲染、memory K1 钩子。
