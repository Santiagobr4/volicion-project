const TAB_ITEMS = [
  { id: "tracker", label: "Seguimiento" },
  { id: "history", label: "Historial" },
  { id: "ranking", label: "Clasificación" },
  { id: "profile", label: "Perfil" },
];

export default function SectionTabs({ current, onChange }) {
  return (
    <div className="mb-6 rounded-2xl border border-slate-300 dark:border-slate-700 p-1 bg-white/70 dark:bg-slate-800/70 overflow-x-auto">
      <div className="inline-flex min-w-max gap-1">
        {TAB_ITEMS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`px-3 sm:px-4 py-2 rounded-xl text-sm font-medium transition whitespace-nowrap cursor-pointer ${
              current === tab.id
                ? "bg-slate-900 text-white dark:bg-slate-200 dark:text-slate-900"
                : "text-slate-600 dark:text-slate-300"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}
