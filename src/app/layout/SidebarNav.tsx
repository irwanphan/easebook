import { useCallback, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import easebookIcon from "@/assets/icons/easebook-icon.svg";
import type { PrimaryNavEntry } from "@/config/navigation";
import { logoutNavItem } from "@/config/navigation";
import { SidebarNavGroup } from "@/app/layout/SidebarNavGroup";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { useAuth } from "@/features/auth/AuthContext";

const SIDEBAR_EXPANDED_KEY = "easybook-sidebar-expanded";

type SidebarNavProps = {
  items: PrimaryNavEntry[];
};

function readStoredExpanded(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(SIDEBAR_EXPANDED_KEY) === "1";
}

function navLinkClass(isActive: boolean, expanded: boolean) {
  const base = [
    "flex h-11 shrink-0 items-center rounded-xl transition-colors cursor-pointer",
    expanded ? "w-full min-w-0 justify-start gap-3 px-3" : "w-11 justify-center",
    isActive
      ? "bg-brand-600 text-white shadow-md shadow-brand-600/25"
      : "text-zinc-400 hover:bg-zinc-800 hover:text-white",
  ];
  return base.join(" ");
}

export function SidebarNav({ items }: SidebarNavProps) {
  const { session, logout } = useAuth();
  const navigate = useNavigate();
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
      className={`relative flex h-full min-h-0 shrink-0 flex-col border-r border-zinc-800 bg-zinc-950 py-5 transition-[width] duration-200 ease-out ${
        expanded ? "w-56 px-3" : "w-[72px] items-center px-0"
      }`}
      aria-label="Navigasi aplikasi"
    >
      <div
        className={`mb-4 flex w-full items-center ${expanded ? "justify-between gap-2 px-0.5" : "flex-col gap-2"}`}
      >
        <div className="flex min-w-0 items-center gap-2">
          <img
            src={easebookIcon}
            alt="EasyBook"
            width={40}
            height={40}
            className="h-10 w-10 shrink-0 rounded-xl object-cover shadow-lg shadow-brand-600/20"
          />
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
          <UserAvatar
            fotoProfilPath={session?.fotoProfilPath}
            nama={session?.namaLengkap}
            size={36}
            className="h-full w-full"
          />
        </div>
        {expanded ? (
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white">
              {session?.namaLengkap || session?.username || "—"}
            </p>
            <p className="truncate text-xs text-zinc-500">
              {session?.isAdmin ? "Administrator" : session?.username || "Pengguna"}
            </p>
          </div>
        ) : null}
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto overscroll-y-contain [-webkit-overflow-scrolling:touch]">
        <nav
          id="sidebar-main-nav"
          className={`flex flex-col gap-2 pb-1 ${expanded ? "w-full" : "items-center"}`}
          aria-label="Menu utama"
        >
          {items.map((entry) => {
            if (entry.kind === "group") {
              return (
                <SidebarNavGroup
                  key={entry.id}
                  group={entry}
                  sidebarExpanded={expanded}
                  rowClass={navLinkClass}
                />
              );
            }
            const Icon = entry.icon;
            return (
              <NavLink
                key={entry.id}
                to={entry.path}
                end={entry.path === "/"}
                title={expanded ? undefined : entry.label}
                className={({ isActive }) => navLinkClass(isActive, expanded)}
              >
                <Icon className="h-5 w-5 shrink-0" strokeWidth={1.75} aria-hidden />
                {expanded ? (
                  <span className="min-w-0 truncate text-sm font-medium">{entry.label}</span>
                ) : null}
              </NavLink>
            );
          })}
        </nav>
      </div>

      <button
        type="button"
        title={expanded ? undefined : logoutNavItem.label}
        onClick={() => {
          logout();
          navigate("/login", { replace: true });
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
