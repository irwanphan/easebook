import { useCallback, useState } from "react";
import { NavLink } from "react-router-dom";
import { Box, ChevronLeft, ChevronRight } from "lucide-react";
import type { NavItem } from "@/config/navigation";
import { logoutNavItem } from "@/config/navigation";

const SIDEBAR_EXPANDED_KEY = "easybook-sidebar-expanded";

type SidebarNavProps = {
  items: NavItem[];
};

function readStoredExpanded(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(SIDEBAR_EXPANDED_KEY) === "1";
}

function navLinkClass(isActive: boolean, expanded: boolean) {
  const base = [
    "flex h-11 shrink-0 items-center rounded-xl transition-colors",
    expanded ? "w-full min-w-0 justify-start gap-3 px-3" : "w-11 justify-center",
    isActive
      ? "bg-brand-600 text-white shadow-md shadow-brand-600/25"
      : "text-zinc-400 hover:bg-zinc-800 hover:text-white",
  ];
  return base.join(" ");
}

export function SidebarNav({ items }: SidebarNavProps) {
  const LogoutIcon = logoutNavItem.icon;
  const [expanded, setExpanded] = useState(readStoredExpanded);

  const toggleExpanded = useCallback(() => {
    setExpanded((prev) => {
      const next = !prev;
      window.localStorage.setItem(SIDEBAR_EXPANDED_KEY, next ? "1" : "0");
      return next;
    });
  }, []);

  return (
    <aside
      className={`flex shrink-0 flex-col border-r border-zinc-800 bg-zinc-950 py-5 transition-[width] duration-200 ease-out ${
        expanded ? "w-56 px-3" : "w-[72px] items-center px-0"
      }`}
      aria-label="Navigasi aplikasi"
    >
      <div
        className={`mb-4 flex w-full items-center ${expanded ? "justify-between gap-2 px-0.5" : "flex-col gap-2"}`}
      >
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-violet-700 text-white shadow-lg shadow-brand-600/30">
            <Box className="h-5 w-5" strokeWidth={2} />
          </div>
          {expanded ? (
            <span className="truncate text-sm font-semibold tracking-tight text-white">
              EasyBook
            </span>
          ) : null}
        </div>
        <button
          type="button"
          onClick={toggleExpanded}
          aria-expanded={expanded}
          aria-controls="sidebar-main-nav"
          title={expanded ? "Ciutkan menu" : "Perluas menu"}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-zinc-800 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
        >
          {expanded ? (
            <ChevronLeft className="h-5 w-5" strokeWidth={2} aria-hidden />
          ) : (
            <ChevronRight className="h-5 w-5" strokeWidth={2} aria-hidden />
          )}
        </button>
      </div>

      <div
        className={`mb-4 flex ${expanded ? "w-full items-center gap-3" : "flex-col items-center"}`}
      >
        <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full ring-2 ring-zinc-700">
          <img
            src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&h=80&fit=crop&crop=face"
            alt=""
            className="h-full w-full object-cover"
          />
        </div>
        {expanded ? (
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white">Starc</p>
            <p className="truncate text-xs text-zinc-500">Admin</p>
          </div>
        ) : null}
      </div>

      <nav
        id="sidebar-main-nav"
        className={`flex flex-1 flex-col gap-2 ${expanded ? "w-full" : "items-center"}`}
        aria-label="Menu utama"
      >
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.id}
              to={item.path}
              end={item.path === "/"}
              title={expanded ? undefined : item.label}
              className={({ isActive }) => navLinkClass(isActive, expanded)}
            >
              <Icon className="h-5 w-5 shrink-0" strokeWidth={1.75} aria-hidden />
              {expanded ? (
                <span className="min-w-0 truncate text-sm font-medium">{item.label}</span>
              ) : null}
            </NavLink>
          );
        })}
      </nav>

      <button
        type="button"
        title={expanded ? undefined : logoutNavItem.label}
        onClick={() => {
          /* hook ke Tauri exit nanti */
        }}
        className={`${navLinkClass(false, expanded)} mt-2`}
      >
        <LogoutIcon className="h-5 w-5 shrink-0" strokeWidth={1.75} aria-hidden />
        {expanded ? (
          <span className="min-w-0 truncate text-sm font-medium">{logoutNavItem.label}</span>
        ) : null}
      </button>
    </aside>
  );
}
