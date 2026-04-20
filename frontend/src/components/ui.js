const baseInteractive =
  "cursor-pointer transition focus:outline-none focus:ring-2 focus:ring-slate-300 dark:focus:ring-slate-600 disabled:cursor-not-allowed disabled:opacity-60";

export const panelShellClassName =
  "rounded-3xl border border-slate-200/80 dark:border-slate-700 bg-white/90 dark:bg-slate-900/80 shadow-sm";

export const modalBackdropClassName =
  "fixed inset-0 z-50 bg-slate-950/55 backdrop-blur-sm flex items-center justify-center px-3 py-4";

export const modalPanelClassName =
  "w-full max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl";

export const inputClassName =
  "w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2.5 text-black dark:text-white outline-none transition placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-slate-300 dark:focus:ring-slate-600 disabled:cursor-not-allowed disabled:opacity-60";

export const labelClassName =
  "block text-sm font-medium text-slate-600 dark:text-slate-300";

export const helpTextClassName =
  "text-sm leading-6 text-slate-500 dark:text-slate-300";

export const buttonClassName = ({
  variant = "primary",
  size = "md",
  fullWidth = false,
} = {}) => {
  const sizeClass = size === "sm" ? "px-3 py-2 text-sm" : "px-4 py-2.5 text-sm";
  const widthClass = fullWidth ? "w-full" : "inline-flex";

  const variantClass = {
    primary:
      "border border-slate-900 bg-slate-900 text-white hover:bg-slate-800 dark:border-slate-200 dark:bg-slate-200 dark:text-slate-900 dark:hover:bg-slate-100",
    secondary:
      "border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800",
    danger:
      "border border-red-500 bg-red-500 text-white hover:bg-red-600 dark:border-red-400 dark:bg-red-500 dark:hover:bg-red-400",
    ghost:
      "border border-transparent bg-transparent text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800",
  }[variant];

  return [
    "items-center justify-center gap-2 rounded-xl font-medium",
    baseInteractive,
    widthClass,
    sizeClass,
    variantClass,
  ]
    .filter(Boolean)
    .join(" ");
};

export const segmentedButtonClassName = (selected) =>
  [
    "px-4 py-2 rounded-lg text-sm font-medium cursor-pointer",
    baseInteractive,
    selected
      ? "bg-slate-900 text-white dark:bg-slate-200 dark:text-slate-900"
      : "text-slate-600 dark:text-slate-300",
  ]
    .filter(Boolean)
    .join(" ");
