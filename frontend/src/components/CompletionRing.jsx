import { formatPercent } from "../utils/completion";
import { eyebrowClassName } from "./ui.js";

export default function CompletionRing({ value, title, subtitle, accent = "ink" }) {
  const hasValue = value !== null && value !== undefined;
  const safeValue = hasValue ? value : 0;
  const clamped = Math.max(0, Math.min(100, safeValue));
  const r = 56;
  const c = 2 * Math.PI * r;
  const dash = (clamped / 100) * c;
  const strokeColor = accent === "lime" ? "var(--lime)" : "var(--ink)";

  return (
    <div className="h-full rounded-[14px] border border-ink/10 p-5 bg-paper flex flex-col">
      <span className={eyebrowClassName}>
        {title}
      </span>

      <div className="mt-6 flex items-center justify-center flex-1">
        <div className="relative w-[140px] h-[140px]">
          <svg viewBox="0 0 140 140" className="w-full h-full" aria-label={formatPercent(value)}>
            <circle cx="70" cy="70" r={r} fill="none" stroke="var(--paper-3)" strokeWidth="8" />
            <circle
              cx="70" cy="70" r={r}
              fill="none" stroke={strokeColor} strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${dash} ${c}`}
              transform="rotate(-90 70 70)"
              style={{ transition: "stroke-dasharray 800ms cubic-bezier(0.2,0.8,0.2,1)" }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center font-serif text-[36px]">
            {hasValue ? <>{Math.round(value)}<span className="text-[16px] text-ink-3">%</span></> : "—"}
          </div>
        </div>
      </div>

      {subtitle && (
        <p className="text-[13px] text-ink-3 mt-4">{subtitle}</p>
      )}
    </div>
  );
}
