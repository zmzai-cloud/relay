import Link from "next/link";
import type { ReactNode } from "react";

/**
 * 台账语言共享组件（V3 设计·UI 批次 B）：页头/指标卡/区块标题。
 * 服务端组件零依赖，控制台与管理端统一复用。
 */

/** 页头：eyebrow + 标题 + 描述 + 右侧动作，底部 1px 墨色硬规则线。 */
export function LedgerHead({
  eyebrow,
  title,
  description,
  actions,
  monoTitle = false,
}: {
  eyebrow: string;
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  monoTitle?: boolean;
}) {
  return (
    <header className="border-b border-rule pb-4">
      <div className="flex flex-wrap items-end justify-between gap-3.5">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-ink-2">{eyebrow}</p>
          <h1 className={`mt-1.5 text-[28px] font-semibold leading-tight tracking-tight ${monoTitle ? "font-mono" : ""}`}>{title}</h1>
          {description ? <p className="mt-2 max-w-[62ch] text-sm leading-6 text-ink-2">{description}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2.5">{actions}</div> : null}
      </div>
    </header>
  );
}

/** 指标卡：mono 大写小标签 + 等宽大数字 + 提示行。 */
export function Kpi({
  label,
  value,
  hint,
  danger = false,
  success = false,
}: {
  label: string;
  value: string;
  hint?: string;
  danger?: boolean;
  success?: boolean;
}) {
  const tone = danger ? "text-danger" : success ? "text-success" : "text-ink";
  return (
    <div className="p-5">
      <p className="font-mono text-xs text-ink-2">{label}</p>
      <p className={`mt-2 font-mono text-3xl font-semibold tracking-tight tabular-nums ${tone}`}>{value}</p>
      {hint ? <p className="mt-1.5 text-xs text-ink-2">{hint}</p> : null}
    </div>
  );
}

/** 指标行：多卡以 1px 分隔拼成一整块。 */
export function KpiRow({ children, cols = 3 }: { children: ReactNode; cols?: number }) {
  const gridCols = cols === 4 ? "sm:grid-cols-2 xl:grid-cols-4" : "sm:grid-cols-3";
  return (
    <div className={`mt-6 grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-line bg-line ${gridCols}`}>
      {children}
    </div>
  );
}

/** 区块标题：硬规则线 + 可选右侧链接。 */
export function SectHead({ title, more }: { title: string; more?: { label: string; href: string } }) {
  return (
    <div className="flex items-baseline justify-between border-b border-rule pb-2.5">
      <h2 className="text-base font-semibold">{title}</h2>
      {more ? (
        <Link href={more.href} className="font-mono text-xs text-ink-2 transition-colors hover:text-ink">
          {more.label} →
        </Link>
      ) : null}
    </div>
  );
}

/**
 * 台账表头行样式（供各页 thead 使用）。
 * 不做 uppercase / 加字距：列名多为中文——uppercase 无意义，而 tracking 会把中文字距拉散。
 */
export const ledgerTh = "border-b border-rule px-4 py-2.5 text-left font-mono text-xs font-normal text-ink-2";
/** 台账数字单元格样式。 */
export const ledgerNum = "px-4 py-3 text-right font-mono text-xs tabular-nums";
