import { useEffect } from "react";

export default function LegalPageShell({
  title,
  description,
  updatedAt,
  children,
}) {
  useEffect(() => {
    document.title = `${title} | Volicion`;
  }, [title]);

  return (
    <article className="max-w-4xl mx-auto">
      <div className="rounded-3xl border border-slate-200/80 dark:border-slate-700 bg-white/90 dark:bg-slate-900/80 p-5 sm:p-6 md:p-8 shadow-sm">
        <p className="text-xs uppercase tracking-[0.22em] text-slate-500 dark:text-slate-300">
          Volicion / Legal
        </p>
        <h1 className="mt-2 text-3xl sm:text-4xl font-semibold tracking-tight">
          {title}
        </h1>
        <p className="mt-3 text-sm sm:text-base leading-7 text-slate-600 dark:text-slate-300 max-w-3xl">
          {description}
        </p>
        <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
          Última actualización: {updatedAt}
        </p>

        <div className="mt-8 space-y-8">{children}</div>
      </div>
    </article>
  );
}
