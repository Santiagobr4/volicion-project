export default function LoadingSpinner({ label = "Cargando..." }) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-3 py-6"
      role="status"
      aria-live="polite"
    >
      <div className="w-9 h-9 rounded-full border-4 border-slate-300 border-t-slate-900 dark:border-slate-700 dark:border-t-slate-100 animate-spin motion-reduce:animate-none" />
      <p className="text-sm text-slate-500 dark:text-slate-300">{label}</p>
    </div>
  );
}
