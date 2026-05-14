type TabItem = {
  id: string;
  label: string;
};

type TabsBarProps = {
  tabs: TabItem[];
  activeId: string;
  onChange: (id: string) => void;
};

export function TabsBar({ tabs, activeId, onChange }: TabsBarProps) {
  return (
    <div
      role="tablist"
      aria-label="Bagian pengaturan"
      className="flex flex-wrap gap-1 border-b border-zinc-200"
    >
      {tabs.map((tab) => {
        const selected = activeId === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(tab.id)}
            className={[
              "relative -mb-px border-b-2 px-4 py-3 text-sm font-semibold transition-colors",
              selected
                ? "border-brand-600 text-brand-700"
                : "border-transparent text-zinc-500 hover:border-zinc-300 hover:text-zinc-800",
            ].join(" ")}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
