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
    <div className="fixed bottom-6 right-6 z-50">
      <div
        className={`${colors[type]} text-white px-4 py-3 rounded-lg shadow-lg`}
      >
        {message}
      </div>
    </div>
  );
}
