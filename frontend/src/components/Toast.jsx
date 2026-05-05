import { useEffect } from "react";

export default function Toast({ message, type, onClose }) {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(onClose, 2500);
    return () => clearTimeout(timer);
  }, [message, onClose]);

  if (!message) return null;

  const styles = {
    success: "bg-lime text-lime-ink border-lime/50",
    error:   "bg-signal-soft text-signal border-signal/30",
    info:    "bg-paper-2 text-ink border-ink/10",
  };

  return (
    <div className="fixed bottom-4 left-3 right-3 sm:left-auto sm:right-6 sm:bottom-6 z-50">
      <div
        className={`border px-4 py-3 rounded-[14px] shadow-lg text-sm break-words max-w-full sm:max-w-sm ${styles[type] ?? styles.info}`}
      >
        {message}
      </div>
    </div>
  );
}
