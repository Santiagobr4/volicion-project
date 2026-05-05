// Design system — Tailwind utility classes matching the Volicion editorial style

export const eyebrow =
  "font-mono text-[11px] tracking-[0.12em] uppercase text-ink-3";

export const tDisplay =
  "font-serif font-normal leading-[0.95] tracking-[-0.02em]";

export const card =
  "bg-paper border border-ink/10 rounded-[18px] p-6 shadow-[0_1px_0_rgba(26,24,20,0.04),0_12px_40px_-20px_rgba(26,24,20,0.18)]";

export const cardFlat =
  "bg-paper-2 border border-transparent rounded-[18px] p-6";

export const panelShellClassName =
  "rounded-[18px] border border-ink/10 bg-paper";

export const modalBackdropClassName =
  "fixed inset-0 z-50 bg-ink/55 backdrop-blur-sm flex items-center justify-center px-3 py-4";

export const modalPanelClassName =
  "w-full max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-[18px] border border-ink/10 bg-paper shadow-xl";

export const inputClassName =
  "w-full bg-transparent border-0 border-b border-ink/22 py-2.5 font-serif text-[22px] text-ink placeholder:text-ink-4 placeholder:font-serif outline-none focus:border-ink transition-colors";

export const labelClassName =
  "font-mono text-[11px] tracking-[0.10em] uppercase text-ink-3";

export const helpTextClassName =
  "text-sm leading-6 text-ink-3";

export const buttonClassName = ({
  variant = "primary",
  size = "md",
  fullWidth = false,
} = {}) => {
  const sizeClass =
    size === "sm" ? "px-3.5 py-2 text-[13px]" : "px-[18px] py-3 text-sm";
  const widthClass = fullWidth ? "w-full" : "inline-flex";

  const variantClass = {
    primary:
      "border border-ink bg-ink text-paper hover:-translate-y-px active:translate-y-0",
    secondary:
      "border border-ink/22 bg-transparent text-ink hover:border-ink",
    danger:
      "border border-signal/40 bg-transparent text-signal hover:bg-signal-soft",
    ghost:
      "border border-ink/22 bg-transparent text-ink hover:border-ink",
  }[variant];

  return [
    widthClass,
    "items-center justify-center gap-2 rounded-full font-medium font-sans cursor-pointer transition",
    sizeClass,
    variantClass,
  ]
    .filter(Boolean)
    .join(" ");
};

export const segmentedContainerClassName =
  "inline-flex bg-paper-2 border border-ink/10 rounded-full p-[3px]";

export const segmentedButtonClassName = (selected) =>
  [
    "px-3.5 py-2 rounded-full text-sm font-medium cursor-pointer transition-all",
    selected
      ? "bg-ink text-paper"
      : "bg-transparent text-ink-3 hover:text-ink",
  ]
    .filter(Boolean)
    .join(" ");
