export default function CardHeader({ title, badge }) {
  return (
    <div className="flex items-start justify-between gap-3 mb-3">
      <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
        {title}
      </p>

      {badge && (
        <span className="shrink-0 rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-1 text-[11px] font-semibold text-slate-500 dark:text-slate-300">
          {badge}
        </span>
      )}
    </div>
  );
}
