import { NavLink } from "react-router-dom";
import { Box } from "lucide-react";
import type { NavItem } from "@/config/navigation";
import { logoutNavItem } from "@/config/navigation";

type SidebarNavProps = {
  items: NavItem[];
};

function navLinkClass(isActive: boolean) {
  return [
    "flex h-11 w-11 items-center justify-center rounded-xl transition-colors",
    isActive
      ? "bg-brand-600 text-white shadow-md shadow-brand-600/25"
      : "text-zinc-400 hover:bg-zinc-800 hover:text-white",
  ].join(" ");
}

export function SidebarNav({ items }: SidebarNavProps) {
  const LogoutIcon = logoutNavItem.icon;

  return (
    <aside className="flex w-[72px] shrink-0 flex-col items-center border-r border-zinc-800 bg-zinc-950 py-5">
      <div className="mb-6 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-violet-700 text-white shadow-lg shadow-brand-600/30">
        <Box className="h-5 w-5" strokeWidth={2} />
      </div>

      <div className="mb-4 h-9 w-9 overflow-hidden rounded-full ring-2 ring-zinc-700">
        <img
          src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&h=80&fit=crop&crop=face"
          alt=""
          className="h-full w-full object-cover"
        />
      </div>

      <nav className="flex flex-1 flex-col items-center gap-2" aria-label="Menu utama">
        {items.map((item) => (
          <NavLink
            key={item.id}
            to={item.path}
            end={item.path === "/"}
            title={item.label}
            className={({ isActive }) => navLinkClass(isActive)}
          >
            <item.icon className="h-5 w-5" strokeWidth={1.75} />
          </NavLink>
        ))}
      </nav>

      <button
        type="button"
        title={logoutNavItem.label}
        onClick={() => {
          /* hook ke Tauri exit nanti */
        }}
        className={`${navLinkClass(false)} mt-2`}
      >
        <LogoutIcon className="h-5 w-5" strokeWidth={1.75} />
      </button>
    </aside>
  );
}
