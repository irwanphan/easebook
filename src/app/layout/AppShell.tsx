import { Outlet } from "react-router-dom";
import { SidebarNav } from "@/app/layout/SidebarNav";
import { primaryNavItems } from "@/config/navigation";

export function AppShell() {
  return (
    <div className="flex h-full min-h-0 bg-zinc-100">
      <SidebarNav items={primaryNavItems} />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <main className="min-h-0 flex-1 overflow-y-auto p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
