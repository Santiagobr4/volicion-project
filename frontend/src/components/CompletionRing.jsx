import {
  formatPercent,
  getCompletionColor,
  getCompletionLevel,
  getCompletionLevelHint,
} from "../utils/completion";

export default function CompletionRing({ value, title, subtitle }) {
  const hasValue = value !== null && value !== undefined;
  const safeValue = hasValue ? value : 0;
  const clamped = Math.max(0, Math.min(100, safeValue));
  const radius = 42;
  const strokeWidth = 12;
  const normalizedRadius = radius - strokeWidth / 2;
  const circumference = 2 * Math.PI * normalizedRadius;
  const dashOffset = circumference - (clamped / 100) * circumference;
  const strokeColor = hasValue ? getCompletionColor(value) : "var(--paper-3)";
  const level = getCompletionLevel(value);
  const levelHint = getCompletionLevelHint(value);

  return (
    <div className="h-full rounded-[14px] border border-ink/10 p-4 bg-paper flex flex-col">
      <div className="flex items-start justify-between gap-3 mb-3">
        <p className="font-mono text-[11px] tracking-[0.10em] uppercase text-ink-3">{title}</p>
        <span className="shrink-0 rounded-full border border-ink/10 bg-paper-2 px-2.5 py-1 font-mono text-[11px] text-ink-3">
          {formatPercent(value)}
        </span>
      </div>

      <div className="mt-3 flex items-center justify-center flex-1">
        <div className="relative w-32 h-32">
          <svg viewBox="0 0 100 100" className="w-full h-full" aria-label={formatPercent(value)}>
            <circle
              cx="50" cy="50" r={normalizedRadius}
              fill="transparent" stroke="var(--paper-3)" strokeWidth={strokeWidth}
            />
            <circle
              cx="50" cy="50" r={normalizedRadius}
              fill="transparent" stroke={strokeColor} strokeWidth={strokeWidth}
              strokeLinecap="round" strokeDasharray={circumference}
              strokeDashoffset={dashOffset} transform="rotate(-90 50 50)"
              style={{ transition: "stroke-dashoffset 220ms ease" }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="font-serif text-2xl leading-none">
              {hasValue ? formatPercent(value) : "—"}
            </p>
          </div>
        </div>
      </div>

      <p className="text-xs text-ink-3 mt-3 text-center min-h-8">{subtitle}</p>
      <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-4 text-center mt-1">
        {level} · {levelHint}
      </p>
    </div>
  );
}
