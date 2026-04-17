import { useEffect } from "react";

export default function Toast({ message, type, onClose }) {
  useEffect(() => {
    if (!message) return;

    const timer = setTimeout(() => {
      onClose();
    }, 2500);

    return () => clearTimeout(timer);
  }, [message, onClose]);

  if (!message) return null;

  const colors = {
    success: "bg-green-500",
    error: "bg-red-500",
    info: "bg-slate-600",
  };

  return (
    <div className="fixed bottom-4 left-3 right-3 sm:left-auto sm:right-6 sm:bottom-6 z-50">
      <div
        className={`${colors[type]} text-white px-4 py-3 rounded-lg shadow-lg text-sm break-words max-w-full sm:max-w-sm`}
      >
        {message}
      </div>
    </div>
  );
}
