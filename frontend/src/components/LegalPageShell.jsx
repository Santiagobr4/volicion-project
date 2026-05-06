import { useEffect } from "react";
import PageBrandHeader from "./PageBrandHeader";
import { eyebrowClassName } from "./ui.js";

export default function LegalPageShell({
  title,
  description,
  updatedAt,
  children,
}) {
  useEffect(() => {
    document.title = `${title} | VOLICION`;
  }, [title]);

  return (
    <>
      <PageBrandHeader />
      <article className="max-w-[860px] mx-auto px-4 sm:px-8 pt-12 pb-20 page-fade">
      <div>
        <span className={eyebrowClassName}>
          VOLICION · Legal
        </span>
        <h1 className="font-serif text-[length:var(--text-h1)] leading-[0.98] tracking-[-0.025em] mt-3">
          {title}
        </h1>
        {description && (
          <p className="text-[17px] text-ink-2 leading-[1.55] mt-4 max-w-[620px]">
            {description}
          </p>
        )}
        {updatedAt && (
          <p className="font-mono text-[11px] tracking-[0.10em] uppercase text-ink-4 mt-6">
            Última actualización · {updatedAt}
          </p>
        )}
      </div>

      <div className="mt-12 border-t border-ink/10 pt-12 space-y-10">
        {children}
      </div>
      </article>
    </>
  );
}
