"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/auth/local/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(json.error ?? "登录失败");
      return;
    }
    router.push(json.user?.role === "admin" ? "/admin" : "/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="mt-6 flex flex-col gap-4">
      <label className="flex flex-col gap-1.5 text-sm">
        邮箱
        <input
          type="email" required autoComplete="username" value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="h-10 rounded-md border border-line-strong bg-bg px-3 outline-none focus:border-accent"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm">
        密码
        <input
          type="password" required autoComplete="current-password" value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="h-10 rounded-md border border-line-strong bg-bg px-3 outline-none focus:border-accent"
        />
      </label>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      <button
        type="submit" disabled={busy}
        className="h-10 rounded-md border border-accent bg-accent text-sm font-medium text-accent-ink transition-colors hover:bg-accent-strong disabled:opacity-50"
      >
        {busy ? "登录中…" : "登录"}
      </button>
    </form>
  );
}
