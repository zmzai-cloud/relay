"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button, Input } from "@zmzai/theme";

type Step = 0 | 1 | 2;
const STEPS = ["管理员", "品牌", "完成"] as const;
const SPOTS = [
  { id: "magenta", label: "品红", swatch: "#FF00A8" },
  { id: "indigo", label: "靛蓝", swatch: "#5B5BD6" },
  { id: "green", label: "松绿", swatch: "#0F8A5F" },
] as const;

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const ORIGIN_RE = /^https:\/\/[a-z0-9.-]+(:\d+)?$/i;

export function SetupWizard() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(0);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [siteName, setSiteName] = useState("Relay");
  const [apiOrigin, setApiOrigin] = useState("");
  const [spot, setSpot] = useState<(typeof SPOTS)[number]["id"]>("magenta");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  /** 返回校验是否通过；失败时把原因写进 error。 */
  function validate(fromAdmin: boolean): boolean {
    const problem = fromAdmin
      ? !EMAIL_RE.test(email.trim()) ? "请输入有效的管理员邮箱"
      : password.length < 8 ? "密码至少 8 位"
      : password !== password2 ? "两次输入的密码不一致"
      : null
      : !siteName.trim() ? "请填写站点名"
      : !ORIGIN_RE.test(apiOrigin.trim()) ? "对外域名需形如 https://api.example.com"
      : null;
    setError(problem);
    return problem === null;
  }

  function next(fromAdmin: boolean) {
    if (!validate(fromAdmin)) return;
    setStep((s) => (s + 1) as Step);
  }

  async function finish() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/setup", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        admin: { email: email.trim(), password },
        brand: { siteName: siteName.trim(), apiOrigin: apiOrigin.trim(), spotPreset: spot },
      }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(json.error ?? "安装失败");
      return;
    }
    router.refresh();
  }

  const summary = (
    <dl className="mt-6 grid grid-cols-[7rem_1fr] gap-y-2 text-sm">
      <dt className="text-muted">管理员</dt><dd className="font-mono">{email.trim()}</dd>
      <dt className="text-muted">站点名</dt><dd>{siteName.trim()}</dd>
      <dt className="text-muted">对外域名</dt><dd className="font-mono">{apiOrigin.trim()}</dd>
      <dt className="text-muted">点睛色</dt><dd>{SPOTS.find((s) => s.id === spot)?.label}</dd>
    </dl>
  );

  return (
    <div className="mt-8">
      <ol className="flex gap-px overflow-hidden rounded-md border border-line" aria-label="安装步骤">
        {STEPS.map((label, i) => (
          <li
            key={label}
            aria-current={i === step ? "step" : undefined}
            className={`flex flex-1 items-center gap-2 px-3 py-2.5 text-xs ${i === step ? "bg-surface-2 font-medium text-ink" : i < step ? "text-success" : "text-muted"}`}
          >
            <span className="font-mono">{i < step ? "✓" : `0${i + 1}`}</span>
            {label}
          </li>
        ))}
      </ol>

      {step === 0 ? (
        <form onSubmit={(e) => { e.preventDefault(); next(true); }} className="mt-6 flex flex-col gap-4">
          <p className="text-sm text-ink-2">账号密码保存在本站数据库（argon2id 哈希），此账号为首个管理员。</p>
          <label className="flex flex-col gap-1.5 text-sm">管理员邮箱
            <Input  type="email" required autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">密码（至少 8 位）
            <Input  type="password" required minLength={8} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">确认密码
            <Input  type="password" required autoComplete="new-password" value={password2} onChange={(e) => setPassword2(e.target.value)} />
          </label>
          <Button type="submit" className="self-start">下一步：品牌</Button>
        </form>
      ) : null}

      {step === 1 ? (
        <form onSubmit={(e) => { e.preventDefault(); next(false); }} className="mt-6 flex flex-col gap-4">
          <label className="flex flex-col gap-1.5 text-sm">站点名
            <Input  required maxLength={40} value={siteName} onChange={(e) => setSiteName(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">对外 API 域名
            <Input className="font-mono"  required placeholder="https://api.example.com" value={apiOrigin} onChange={(e) => setApiOrigin(e.target.value)} />
            <span className="text-xs text-muted">客户端以 <code className="font-mono">{apiOrigin.trim() || "https://…"}/v1</code> 作为 baseURL。须与部署时设置的 NEXT_PUBLIC_API_ORIGIN 一致。</span>
          </label>
          <fieldset className="flex flex-col gap-2">
            <legend className="text-sm">点睛色（终端面板内的强调色）</legend>
            <div className="flex gap-3">
              {SPOTS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  aria-pressed={spot === s.id}
                  onClick={() => setSpot(s.id)}
                  className={`flex items-center gap-2 rounded-md border px-3 py-2 text-xs transition-colors ${spot === s.id ? "border-accent" : "border-line hover:border-line-strong"}`}
                >
                  <span className="h-4 w-4 rounded-sm" style={{ background: s.swatch }} aria-hidden="true" />
                  {s.label}
                </button>
              ))}
            </div>
          </fieldset>
          <div className="flex gap-3">
            <Button type="button" variant="secondary" onClick={() => setStep(0)}>上一步</Button>
            <Button type="submit">下一步：确认</Button>
          </div>
        </form>
      ) : null}

      {step === 2 ? (
        <div className="mt-6">
          {summary}
          <p className="mt-6 text-sm leading-6 text-ink-2">
            点击完成后即以管理员身份登录。接着用「添加模型引导」接入第一条上游渠道并定价——完成后即可调用。
          </p>
          <div className="mt-6 flex gap-3">
            <Button type="button" variant="secondary" disabled={busy} onClick={() => setStep(1)}>上一步</Button>
            <Button type="button" disabled={busy} onClick={() => void finish()}>{busy ? "安装中…" : "完成安装"}</Button>
          </div>
        </div>
      ) : null}

      {error ? <p role="alert" className="mt-4 text-sm text-danger">{error}</p> : null}
    </div>
  );
}
