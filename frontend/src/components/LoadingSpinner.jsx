export default function LoadingSpinner({ label = "Cargando..." }) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-3 py-8"
      role="status"
      aria-live="polite"
    >
      <div className="w-8 h-8 rounded-full border-2 border-ink/15 border-t-ink animate-spin motion-reduce:animate-none" />
      <p className="font-mono text-[11px] tracking-[0.10em] uppercase text-ink-4">{label}</p>
    </div>
  );
}
