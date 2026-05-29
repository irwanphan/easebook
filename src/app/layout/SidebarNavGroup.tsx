import { useEffect, useRef, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import type { NavGroupEntry } from "@/config/navigation";

type SidebarNavGroupProps = {
  group: NavGroupEntry;
  sidebarExpanded: boolean;
  rowClass: (isActive: boolean, expanded: boolean) => string;
};

function subLinkClass(isActive: boolean) {
  return [
    "flex min-h-9 w-full items-center rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors",
    isActive
      ? "bg-brand-600 text-white shadow-sm shadow-brand-600/20"
      : "text-zinc-400 hover:bg-zinc-800 hover:text-white",
  ].join(" ");
}

export function SidebarNavGroup({ group, sidebarExpanded, rowClass }: SidebarNavGroupProps) {
  const location = useLocation();
  const Icon = group.icon;
  const rootRef = useRef<HTMLDivElement>(null);
  const [accordionOpen, setAccordionOpen] = useState(false);
  const [flyoutOpen, setFlyoutOpen] = useState(false);

  const childActive = group.children.some(
    (c) => location.pathname === c.path || location.pathname.startsWith(`${c.path}/`),
  );

  useEffect(() => {
    if (childActive) setAccordionOpen(true);
  }, [location.pathname, childActive]);

  useEffect(() => {
    if (!flyoutOpen) return;
    function handlePointerDown(ev: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(ev.target as Node)) {
        setFlyoutOpen(false);
      }
    }
    document.addEventListener("pointerdown", handlePointerDown, true);
    return () => document.removeEventListener("pointerdown", handlePointerDown, true);
  }, [flyoutOpen]);

  useEffect(() => {
    if (sidebarExpanded) setFlyoutOpen(false);
  }, [sidebarExpanded]);

  const parentActive = childActive;

  if (sidebarExpanded) {
    return (
      <div className="w-full">
        <button
          type="button"
          onClick={() => setAccordionOpen((o) => !o)}
          aria-expanded={accordionOpen}
          className={rowClass(parentActive, true)}
        >
          <Icon className="h-5 w-5 shrink-0" strokeWidth={1.75} aria-hidden />
          <span className="min-w-0 flex-1 truncate text-left text-sm font-medium">{group.label}</span>
          <ChevronDown
            className={`h-4 w-4 shrink-0 transition-transform ${accordionOpen ? "rotate-180" : ""}`}
            aria-hidden
          />
        </button>
        {accordionOpen ? (
          <div
            className="mt-1 space-y-0.5 border-l border-zinc-700/80 py-1 pl-2 ml-4"
            role="group"
            aria-label={group.label}
          >
            {group.children.map((child) => (
              <NavLink
                key={child.id}
                to={child.path}
                className={({ isActive }) => subLinkClass(isActive)}
                onClick={() => setFlyoutOpen(false)}
              >
                {child.label}
              </NavLink>
            ))}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="relative flex flex-col items-center" ref={rootRef}>
      <button
        type="button"
        onClick={() => setFlyoutOpen((o) => !o)}
        aria-expanded={flyoutOpen}
        aria-haspopup="true"
        title={group.label}
        className={rowClass(parentActive, false)}
      >
        <Icon className="h-5 w-5 shrink-0" strokeWidth={1.75} aria-hidden />
      </button>
      {flyoutOpen ? (
        <div
          className="absolute left-full top-0 z-50 ml-2 min-w-[200px] rounded-xl border border-zinc-700 bg-zinc-900 py-1.5 shadow-xl shadow-black/40"
          role="menu"
        >
          <p className="border-b border-zinc-700/80 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            {group.label}
          </p>
          <div className="py-1">
            {group.children.map((child) => (
              <NavLink
                key={child.id}
                to={child.path}
                role="menuitem"
                className={({ isActive }) =>
                  `${subLinkClass(isActive)} mx-1 rounded-lg px-2 font-normal`
                }
                onClick={() => setFlyoutOpen(false)}
              >
                {child.label}
              </NavLink>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
