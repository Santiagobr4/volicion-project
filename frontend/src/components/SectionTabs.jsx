const TAB_ITEMS = [
  { id: "tracker", label: "Seguimiento" },
  { id: "history", label: "Historial" },
  { id: "ranking", label: "Clasificación" },
  { id: "profile", label: "Perfil" },
];

export default function SectionTabs({ current, onChange }) {
  return (
    <div className="flex items-center border-b border-ink/10 overflow-x-auto">
      {TAB_ITEMS.map((tab, i) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={[
            "relative py-4 mr-7 font-sans font-medium text-sm cursor-pointer transition-colors shrink-0 last:mr-0",
            current === tab.id ? "text-ink" : "text-ink-3 hover:text-ink",
          ].join(" ")}
        >
          <span className="font-mono text-[10px] text-ink-4 mr-1.5">
            {String(i + 1).padStart(2, "0")}
          </span>
          {tab.label}
          {current === tab.id && (
            <span className="absolute left-0 right-0 bottom-[-1px] h-[2px] bg-ink rounded-full" />
          )}
        </button>
      ))}
    </div>
  );
}
