import { Link } from "react-router-dom";

function BrandMark() {
  return (
    <span className="relative inline-flex w-[22px] h-[22px] rounded-full bg-ink items-center justify-center shrink-0">
      <span className="absolute inset-[4px] rounded-full bg-paper" />
      <span className="relative z-10 w-[6px] h-[6px] rounded-full bg-ink" />
    </span>
  );
}

/**
 * Minimal sticky topbar for static / standalone pages (legal, reset password,
 * how it works). Provides the brand mark that links home and an explicit
 * "back to start" affordance, so users don't have to scroll to the footer.
 */
export default function PageBrandHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-ink/10 bg-paper/90 backdrop-blur-md">
      <div className="max-w-[1240px] mx-auto px-4 sm:px-8 py-[18px] flex items-center justify-between gap-4">
        <Link
          to="/"
          className="flex items-center gap-2.5 hover:opacity-80 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/30 focus-visible:ring-offset-2 focus-visible:ring-offset-paper rounded-full"
          aria-label="Volver al inicio"
        >
          <BrandMark />
          <span className="font-serif text-[22px] tracking-[0.02em]">VOLICION</span>
        </Link>
        <Link
          to="/"
          className="font-mono text-[11px] tracking-[0.10em] uppercase text-ink-3 hover:text-ink transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/30 focus-visible:ring-offset-2 focus-visible:ring-offset-paper rounded-full px-2 py-1"
        >
          ← Volver al inicio
        </Link>
      </div>
    </header>
  );
}
