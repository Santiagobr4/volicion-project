export default function CardHeader({ title, badge }) {
  return (
    <div className="flex items-start justify-between gap-3 mb-3">
      <p className="font-mono text-[11px] tracking-[0.10em] uppercase text-ink-3">{title}</p>
      {badge && (
        <span className="shrink-0 rounded-full border border-ink/10 bg-paper-2 px-2.5 py-1 font-mono text-[11px] text-ink-3">
          {badge}
        </span>
      )}
    </div>
  );
}
