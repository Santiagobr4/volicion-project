import { useEffect, useId, useRef } from "react";
import { modalBackdropClassName, modalPanelClassName } from "./ui.js";

/**
 * Accessible modal dialog wrapper.
 *
 * Implements WCAG 2.4.3 (focus order), 2.1.2 (no keyboard trap), 4.1.2 (name/role/value).
 * - role="dialog" + aria-modal="true"
 * - Esc key closes
 * - Click on backdrop closes (clicks inside panel do not bubble)
 * - Focuses the panel on open; restores focus to the previously-focused element on close
 *
 * Props:
 * - open: boolean — controls visibility
 * - onClose: () => void — invoked on Esc, backdrop click, close button
 * - title: string — visible heading; also wired to aria-labelledby
 * - children: dialog body
 * - panelClassName: extra classes for the panel (e.g. "max-w-sm p-5")
 */
export default function Dialog({
  open,
  onClose,
  title,
  children,
  panelClassName = "max-w-md p-5 sm:p-6",
}) {
  const titleId = useId();
  const panelRef = useRef(null);
  const previouslyFocusedRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    previouslyFocusedRef.current = document.activeElement;
    const panel = panelRef.current;
    panel?.focus();

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose?.();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      const previous = previouslyFocusedRef.current;
      if (previous && typeof previous.focus === "function") {
        previous.focus();
      }
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className={modalBackdropClassName}>
      {/* Backdrop overlay — click closes the dialog. Keyboard users dismiss with Esc (handled above). */}
      <button
        type="button"
        aria-label="Cerrar"
        tabIndex={-1}
        className="absolute inset-0 cursor-default bg-transparent border-0 p-0"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        tabIndex={-1}
        className={`relative ${modalPanelClassName} ${panelClassName} focus:outline-none`}
      >
        {title && (
          <h3 id={titleId} className="font-serif text-[28px] leading-tight">
            {title}
          </h3>
        )}
        {children}
      </div>
    </div>
  );
}
